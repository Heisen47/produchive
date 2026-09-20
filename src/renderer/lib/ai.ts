/// <reference types="@webgpu/types" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { PlannedRoutineItem } from '../types/routine';
import { resolveCollisionsSequentially } from './smartScheduler';

export const CACHED_MODELS_STORAGE_KEY = 'produchive_downloaded_models';

export const getPersistedDownloadedModels = (): string[] => {
    try {
        if (typeof localStorage === 'undefined') return [];
        const raw = localStorage.getItem(CACHED_MODELS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const markModelDownloaded = (modelId: string) => {
    try {
        if (typeof localStorage === 'undefined') return;
        const current = new Set(getPersistedDownloadedModels());
        current.add(modelId);
        localStorage.setItem(CACHED_MODELS_STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch {}
};

export const unmarkModelDownloaded = (modelId: string) => {
    try {
        if (typeof localStorage === 'undefined') return;
        const current = new Set(getPersistedDownloadedModels());
        current.delete(modelId);
        localStorage.setItem(CACHED_MODELS_STORAGE_KEY, JSON.stringify(Array.from(current)));
    } catch {}
};

export interface AIModel {
    id: string;
    name: string;
    size: string;
    description: string;
    family: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
    {
        id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",
        name: "Qwen 2.5 Coder 7B",
        size: "4.5GB",
        description: "Alibaba's world-class coder and reasoning model. Smartest local model, needs 8GB+ RAM.",
        family: "qwen"
    },
    {
        id: "gemma-2-2b-it-q4f32_1-MLC",
        name: "Gemma 2 2B",
        size: "1.3GB",
        description: "Google's lightweight model. Good balance, but can be basic.",
        family: "gemma"
    },
    {
        id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
        name: "Llama 3.2 3B",
        size: "2.0GB",
        description: "Meta's highly capable 3B model. Strong reasoning and analysis.",
        family: "llama"
    },
    {
        id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC",
        name: "Qwen 2.5 1.5B",
        size: "1.0GB",
        description: "Alibaba's model. Very smart for its size, outperforms Gemma 2B.",
        family: "qwen"
    },
    {
        id: "DeepSeek-R1-Distill-Qwen-1.5B-q4f32_1-MLC",
        name: "DeepSeek R1 1.5B",
        size: "1.0GB",
        description: "Reasoning-focused model. Excellent for analyzing productivity data.",
        family: "qwen"
    },
    {
        id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",
        name: "SmolLM2 1.7B",
        size: "1.1GB",
        description: "HuggingFace's highly optimized small model. Fast & capable.",
        family: "llama"
    },
    {
        id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
        name: "Phi 3.5 Mini",
        size: "2.2GB",
        description: "Microsoft's powerful small model. Great reasoning capabilities.",
        family: "phi"
    },
    {
        id: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
        name: "Llama 3.2 1B",
        size: "800MB",
        description: "Meta's highly efficient small model. Fastest download.",
        family: "llama"
    },
    {
        id: "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",
        name: "TinyLlama 1.1B",
        size: "650MB",
        description: "Extremely compact model for older devices.",
        family: "llama"
    },
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Logging utility
const log = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [AI]`, ...args);
};

// Cache Management Helper
export const hasModelInCache = async (modelId: string): Promise<boolean> => {
    try {
        if (typeof caches !== 'undefined') {
            const cache = await caches.open('webllm/model');
            const keys = await cache.keys();
            const exists = keys.some(req => req.url.includes(modelId));
            if (exists) {
                markModelDownloaded(modelId);
                return true;
            }
        }
        return getPersistedDownloadedModels().includes(modelId);
    } catch (e) {
        return getPersistedDownloadedModels().includes(modelId);
    }
};

export const hasAnyDownloadedModel = async (): Promise<string | null> => {
    try {
        const persisted = getPersistedDownloadedModels();
        if (persisted.length > 0) {
            const match = AVAILABLE_MODELS.find(m => persisted.includes(m.id));
            if (match) return match.id;
        }

        const selected = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedModelId') : null;
        if (selected && (await hasModelInCache(selected))) return selected;
        for (const m of AVAILABLE_MODELS) {
            if (await hasModelInCache(m.id)) {
                markModelDownloaded(m.id);
                return m.id;
            }
        }
        return null;
    } catch {
        return null;
    }
};

export const deleteModelFromCache = async (modelId: string): Promise<void> => {
    try {
        log('info', `Attempting to delete model: ${modelId}`);
        unmarkModelDownloaded(modelId);
        if (typeof caches !== 'undefined') {
            const cache = await caches.open('webllm/model');
            const keys = await cache.keys();
            
            const deletions = keys
                .filter(req => req.url.includes(modelId))
                .map(req => cache.delete(req));
            
            await Promise.all(deletions);
            log('info', `Deleted ${deletions.length} files for ${modelId}`);
        }
    } catch (e) {
        log('error', 'Failed to delete model from cache', e);
        throw e;
    }
};

export const parseModelSizeToMB = (sizeStr: string): number => {
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return 1000;
    if (sizeStr.toLowerCase().includes('gb')) return Math.round(num * 1024);
    if (sizeStr.toLowerCase().includes('mb')) return Math.round(num);
    return 1000;
};

export const getAvailableStorageEstimate = async (): Promise<{ freeMB: number; totalMB: number } | null> => {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const quota = est.quota || 0;
            const usage = est.usage || 0;
            return {
                freeMB: Math.max(0, Math.round((quota - usage) / (1024 * 1024))),
                totalMB: Math.round(quota / (1024 * 1024)),
            };
        }
    } catch {}
    return null;
};

export const parseAIErrorMessage = (error: any, modelName?: string): string => {
    const raw = error?.message || String(error || '');
    const msg = raw.toLowerCase();

    if (msg.includes('insufficient disk space')) {
        return raw;
    }
    if (msg.includes('quota') || msg.includes('storage') || msg.includes('disk') || msg.includes('exceeded')) {
        return `Insufficient Disk Space: Your drive does not have enough storage space to download this AI model${modelName ? ` (${modelName})` : ''}. Please free up disk space on your primary drive (C:) or choose a smaller model (such as Llama 3.2 1B).`;
    }
    if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('timeout') || msg.includes('err_connection')) {
        return `Network Connection Error: The download was interrupted. Please verify your internet connection and try again.`;
    }
    if (msg.includes('webgpu is not supported') || msg.includes('navigator.gpu')) {
        return `WebGPU Not Supported: Your system or graphics card does not currently support WebGPU. Please ensure graphics drivers are up to date and hardware acceleration is enabled.`;
    }
    if (msg.includes('instance dropped') || msg.includes('device lost')) {
        return `GPU Context Reset: Your graphics card ran out of VRAM while initializing the model. Please select a smaller model with lower memory requirements.`;
    }
    return raw || 'Failed to initialize AI model. Please try again or select a smaller model.';
};

export const initEngine = async (
    progressCallback: (report: any) => void,
    selectedModelId?: string
) => {
    log('info', '========================================');
    log('info', `Starting AI Engine Initialization. Selected: ${selectedModelId || 'Auto'}`);
    log('info', '========================================');

    // Check if WebGPU is available
    if (!navigator.gpu) {
        log('error', 'WebGPU is NOT supported on this device');
        throw new Error("WebGPU is not supported on this device. Please verify your graphics drivers and hardware acceleration.");
    }

    // Pre-flight disk space check before starting large multi-GB downloads
    if (selectedModelId) {
        const isCached = await hasModelInCache(selectedModelId);
        if (!isCached) {
            const targetModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
            if (targetModel) {
                const requiredMB = parseModelSizeToMB(targetModel.size);
                const storageEst = await getAvailableStorageEstimate();
                if (storageEst && storageEst.freeMB < requiredMB) {
                    const freeGB = (storageEst.freeMB / 1024).toFixed(1);
                    throw new Error(
                        `Insufficient Disk Space: ${targetModel.name} requires approx ${targetModel.size}, but only ~${freeGB}GB is available in your app storage. Please free up space on drive C: or choose a smaller model.`
                    );
                }
            }
        }
    }

    // Determine which models to try
    // If a specific model is selected, try ONLY that one.
    // Otherwise, fall back to the list.
    const modelsToTry = selectedModelId 
        ? [selectedModelId] 
        : AVAILABLE_MODELS.map(m => m.id);

    // Try each model
    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
        const currentModel = modelsToTry[modelIndex];
        
        progressCallback({
            text: `Initializing ${currentModel}...`,
            progress: 0
        });

        // Attempt to create engine with retries for each model
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log('info', `Attempt ${attempt}/${MAX_RETRIES} for ${currentModel}`);

                const engine = await CreateMLCEngine(
                    currentModel,
                    {
                        initProgressCallback: (report: any) => {
                            // Enhanced logging for download progress
                            if (report.progress !== undefined) {
                                const percent = Math.round(report.progress * 100);
                                if (percent % 10 === 0 || percent === 100) {
                                    log('info', `Download progress: ${percent}% - ${report.text}`);
                                }
                            }
                            progressCallback(report);
                        }
                    }
                );

                log('info', `✅ Model ${currentModel} loaded successfully!`);
                markModelDownloaded(currentModel);
                return { engine, modelName: currentModel };

            } catch (e: any) {
                const errorMsg = e.message || String(e);
                log('warn', `Attempt ${attempt} failed for ${currentModel}:`, errorMsg);

                // Check for recoverable WebGPU errors
                if (errorMsg.includes('Instance dropped') || errorMsg.includes('device lost')) {
                    if (attempt < MAX_RETRIES) {
                        log('info', `GPU context lost. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                        progressCallback({ text: `GPU context lost. Retrying...` });
                        await sleep(RETRY_DELAY_MS);
                        continue;
                    }
                }
                
                // If specific model was requested and failed, throw immediately with friendly message
                if (selectedModelId) {
                    throw new Error(parseAIErrorMessage(e, currentModel));
                }
            }
        }
    }

    // All models failed
    log('error', '❌ All models failed to load');
    throw new Error("Failed to initialize AI engine. Please check your internet connection, free disk space, or try a smaller model.");
};

export const generateCompletion = async (
    engine: any,
    messages: { role: string; content: string }[],
    temperature = 0.7
) => {
    if (!engine) {
        log('error', 'generateCompletion called with null engine');
        throw new Error("Engine not initialized");
    }

    log('info', 'Generating completion...');
    log('info', 'Messages count:', messages.length);

    try {
        const startTime = Date.now();
        const completion = await engine.chat.completions.create({
            messages,
            temperature,
        });
        const duration = Date.now() - startTime;

        log('info', `Completion generated in ${duration}ms`);
        return completion.choices[0]?.message?.content || "";
    } catch (e: any) {
        log('error', 'Completion generation failed:', e.message);
        throw e;
    }
};

export const DEFAULT_PROMPT = `You are a kind, encouraging, and supportive tutor and guide. Your role is to evaluate a student's progress based on their activity relative to their selected goal, and provide a rating out of 10 along with helpful feedback. You HAVE to generate a report when user has a valid goal setup.

You will receive:
- goal: The student's selected goal
- activity: A description of what the student has done

Your behavior rules:
1. You MUST ALWAYS provide a numeric rating between 1 and 10. NEVER use "NA" or any non-numeric value for the rating.
2. If the goal seems unclear, still do your best to evaluate the activity and give a fair numeric rating.
3. Be kind, encouraging, and constructive in all feedback — never harsh or discouraging.
4. Offer specific guidance on what the student did well and what they can improve.
5. You MUST return ONLY valid JSON. No markdown, no code blocks, no extra text outside the JSON.

DISTINCTION GUIDANCE:
- **Role Context**: The user is a **{role}**. Evaluate productivity based on this role.
- **Active vs Passive**: Prioritize ACTIVE work (creation, solving problems, writing, reading questions/articles) over PASSIVE consumption (watching videos, scrolling).
- **App Context**: Apps should be judged based on the goal and role. For example:
    - IDEs/Terminal are productive for Software Engineers.
    - Word/Docs/PDF Readers are productive for Law/Medical students/General students/engineering students.
    - Creative tools (Figma, Blender) are productive for Designers.
- **YouTube/Content**: Educational content is "neutral" or "productive" ONLY if it directly aligns with the goal. Entertainment is "distracting".

IMPORTANT: The rating MUST be a number from 1 to 10. The verdict MUST be one of: "productive", "neutral", or "unproductive". Do NOT use "NA" for any field.

Output format:
{
  "rating": <number 1-10, MUST be a number, never a string>,
  "verdict": "<productive|neutral|unproductive>",
  "explanation": "<2-3 sentences. Be encouraging! Summarize performance and strengths.>",
  "tips": ["<specific, kind improvement 1>", "<specific, kind improvement 2>", "<motivating closing message>"],
  "categorization": {
    "productive": ["<app name 1>", ...],
    "neutral": ["<app name 1>", ...],
    "distracting": ["<app name 1>", ...]
  }
}`;

export interface CalendarScheduleRequest {
    tasks?: { title: string; category?: PlannedRoutineItem['category']; priority?: 'high' | 'medium' | 'low' }[];
    userPrompt?: string;
    currentHour: number;
    currentMinute: number;
    targetDateStr: string;
    timezone?: string;
    allottedHours?: number;
    includeBreakfast?: boolean;
    includeLunch?: boolean;
    includeDinner?: boolean;
    includeRestBlocks?: boolean;
    role?: string;
}

export const CALENDAR_SCHEDULER_SYSTEM_PROMPT = `You are an expert productivity planner. Generate a realistic, focused calendar routine for today based on the user's tasks, goals, and local time.

Rules:
1. Output ONLY a valid JSON array of objects. No markdown formatting, no explanations, no text outside the JSON.
2. Structure each item as:
[
  {
    "title": "Specific task title",
    "category": "development" | "research" | "meeting" | "design" | "writing" | "meal" | "break" | "other",
    "startHour": <0-23>,
    "startMinute": <0-59>,
    "durationMinutes": <15-120>,
    "priority": "high" | "medium" | "low",
    "subtitle": "Short focus tip"
  }
]
3. Current local time constraint: The current time is {currentHour}:{currentMinuteFormatted} ({timezone}).
   All items MUST start at or after {currentHour}:{currentMinuteFormatted}. Do NOT schedule anything before this time.
4. Schedule items sequentially without time collisions. Allocate 45-90 min for deep work, 10-15 min for breaks, and 30-45 min for meals.
5. Emphasize the user's priority tasks and maintain momentum throughout the day.`;

export const extractJSONFromAIResponse = <T = any>(rawText: string): T => {
    let clean = (rawText || '').trim();
    if (clean.includes('```')) {
        const matches = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (matches && matches[1]) {
            clean = matches[1].trim();
        }
    }
    const firstBracket = clean.search(/[\[\{]/);
    if (firstBracket !== -1) {
        const isArray = clean[firstBracket] === '[';
        const lastBracket = isArray ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
        if (lastBracket > firstBracket) {
            clean = clean.substring(firstBracket, lastBracket + 1);
        }
    }
    return JSON.parse(clean);
};

export const sanitizeAndValidateScheduleItems = (
    rawItems: any[],
    request: CalendarScheduleRequest
): PlannedRoutineItem[] => {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return [];
    }

    const validCategories: PlannedRoutineItem['category'][] = [
        'development', 'research', 'meeting', 'design', 'writing', 'break', 'meal', 'sleep', 'other'
    ];

    const currentTotalMins = request.currentHour * 60 + request.currentMinute;
    const isTargetToday = request.targetDateStr === new Date().toISOString().split('T')[0];
    const [y, m, d] = request.targetDateStr.split('-').map(Number);
    const dayIndex = !isNaN(y) && !isNaN(m) && !isNaN(d) ? new Date(y, m - 1, d).getDay() : new Date().getDay();

    const sanitized: PlannedRoutineItem[] = [];

    for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (!item || typeof item !== 'object') continue;

        const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Focus Block ${i + 1}`;
        const rawCat = (item.category || '').toLowerCase().trim();
        const category: PlannedRoutineItem['category'] = validCategories.includes(rawCat as any) ? rawCat as any : 'development';
        const priority: PlannedRoutineItem['priority'] = ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'high';

        let startHour = typeof item.startHour === 'number' && !isNaN(item.startHour) ? Math.max(0, Math.min(23, Math.floor(item.startHour))) : request.currentHour;
        let startMinute = typeof item.startMinute === 'number' && !isNaN(item.startMinute) ? Math.max(0, Math.min(59, Math.floor(item.startMinute))) : 0;
        let durationMinutes = typeof item.durationMinutes === 'number' && !isNaN(item.durationMinutes) ? Math.max(15, Math.min(180, Math.floor(item.durationMinutes))) : 45;

        // If today, push forward any items scheduled before current time
        if (isTargetToday) {
            const itemMins = startHour * 60 + startMinute;
            if (itemMins < currentTotalMins) {
                startHour = request.currentHour;
                startMinute = request.currentMinute;
            }
        }

        sanitized.push({
            id: `routine-ai-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            title,
            category,
            priority,
            dayIndex,
            dateStr: request.targetDateStr,
            startHour,
            startMinute,
            durationMinutes,
            completed: false,
            subtitle: item.subtitle ? String(item.subtitle).trim() : undefined
        });
    }

    return resolveCollisionsSequentially(sanitized);
};

export const generateAICalendarSchedule = async (
    engine: any,
    request: CalendarScheduleRequest
): Promise<PlannedRoutineItem[]> => {
    const tz = request.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
    const currentMinStr = request.currentMinute < 10 ? `0${request.currentMinute}` : `${request.currentMinute}`;
    const timePrompt = `${request.currentHour}:${currentMinStr}`;

    const taskLines = (request.tasks || [])
        .map(t => `- ${t.title}${t.priority ? ` (${t.priority} priority)` : ''}`)
        .join('\n');

    const promptBody = [
        `Local Context: Current time is ${timePrompt} in timezone ${tz} on ${request.targetDateStr}.`,
        request.userPrompt ? `User Desired Focus: "${request.userPrompt}"` : `User Goal: "I want a productive, structured day today."`,
        request.role ? `User Role: ${request.role}` : null,
        request.allottedHours ? `Target productive hours: ${request.allottedHours} hours.` : null,
        request.tasks && request.tasks.length > 0 ? `Specific tasks to schedule:\n${taskLines}` : 'No specific task list provided. Craft an optimal productive day flow with deep focus, research, and breaks.',
        `Include preferences: Lunch: ${request.includeLunch ?? true}, Dinner: ${request.includeDinner ?? true}, Breaks: ${request.includeRestBlocks ?? true}.`,
        `CRITICAL: All generated events must start at or after ${timePrompt}. Output ONLY the JSON array.`
    ].filter(Boolean).join('\n\n');

    const messages = [
        {
            role: 'system',
            content: CALENDAR_SCHEDULER_SYSTEM_PROMPT
                .replace('{currentHour}', String(request.currentHour))
                .replace('{currentMinuteFormatted}', currentMinStr)
                .replace('{timezone}', tz)
        },
        {
            role: 'user',
            content: promptBody
        }
    ];

    const rawResponse = await generateCompletion(engine, messages, 0.4);
    const parsed = extractJSONFromAIResponse<any[]>(rawResponse);
    return sanitizeAndValidateScheduleItems(parsed, request);
};
