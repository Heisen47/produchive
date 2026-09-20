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
            const lowerId = modelId.toLowerCase();
            const exists = keys.some(req => req.url.toLowerCase().includes(lowerId));
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

export const getAnyPersistedDownloadedModelId = (): string | null => {
    try {
        const persisted = getPersistedDownloadedModels();
        if (persisted.length > 0) {
            const match = AVAILABLE_MODELS.find(m => persisted.includes(m.id));
            if (match) return match.id;
        }
        const selected = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedModelId') : null;
        if (selected) {
            const match = AVAILABLE_MODELS.find(m => m.id === selected);
            if (match) return match.id;
        }
    } catch {}
    return null;
};

export const hasAnyDownloadedModel = async (): Promise<string | null> => {
    try {
        const syncId = getAnyPersistedDownloadedModelId();
        if (syncId) return syncId;

        const selected = typeof localStorage !== 'undefined' ? localStorage.getItem('selectedModelId') : null;
        if (selected) {
            const match = AVAILABLE_MODELS.find(m => m.id === selected);
            if (match && (await hasModelInCache(selected))) return selected;
        }
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

export const isEngineInstanceError = (error: any): boolean => {
    const raw = error?.message || String(error || '');
    const msg = raw.toLowerCase();
    return (
        msg.includes('instance reference') ||
        msg.includes('external instance') ||
        msg.includes('reference no longer exists') ||
        msg.includes('instance dropped') ||
        msg.includes('device lost') ||
        msg.includes('context lost') ||
        msg.includes('disposed') ||
        msg.includes('unloaded')
    );
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
    if (isEngineInstanceError(error)) {
        return `AI Engine Disconnected: The local AI model instance was lost or disconnected from WebGPU memory. The engine has been reset—please try again or choose a lighter model (such as Llama 3.2 1B or Qwen 2.5 1.5B).`;
    }
    if (msg.includes('out of memory') || msg.includes('oom') || msg.includes('vram')) {
        return `GPU Memory Exhausted: Your graphics card ran out of VRAM while loading or running the AI model. Please close other heavy applications or choose a lighter model (such as Llama 3.2 1B).`;
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

                // Check for recoverable WebGPU / TVM instance errors
                if (isEngineInstanceError(e)) {
                    if (attempt < MAX_RETRIES) {
                        log('info', `GPU/TVM instance disconnected. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                        progressCallback({ text: `Re-establishing AI engine connection...` });
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
        throw new Error("AI Engine not initialized: Please download and activate an on-device AI model.");
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
        const friendlyMsg = parseAIErrorMessage(e);
        log('error', 'Completion generation failed:', friendlyMsg);
        const wrappedErr = new Error(friendlyMsg);
        (wrappedErr as any).originalError = e;
        (wrappedErr as any).isInstanceError = isEngineInstanceError(e);
        throw wrappedErr;
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
    customSystemPrompt?: string;
    currentHour: number;
    currentMinute: number;
    targetDateStr: string;
    targetDates?: string[];
    planScope?: 'day' | 'week';
    dayOfWeekName?: string;
    isWeekend?: boolean;
    isToday?: boolean;
    timezone?: string;
    allottedHours?: number;
    totalWeeklyHours?: number;
    includeBreakfast?: boolean;
    includeLunch?: boolean;
    includeDinner?: boolean;
    includeRestBlocks?: boolean;
    role?: string;
    compiledUserPrompt?: string;
}

export const CALENDAR_SCHEDULER_SYSTEM_PROMPT = `You are an elite productivity architect and cognitive performance coach. Your mission is to build a realistic, high-impact calendar routine tailored to the user's tasks, energy rhythms, and time budget.

Core Principles for Intelligent Scheduling:
1. Chronotype & Energy Curve:
   - Early/Mid Morning (9:00 - 12:30): Peak focus window. Schedule demanding cognitive deep work (coding, architecture, complex problem-solving, algorithmic thinking).
   - Midday (12:30 - 14:00): Natural digestive dip. Place lunch (30-60m) and light recovery.
   - Early Afternoon (14:00 - 16:30): Secondary focus window for collaborative or creative execution (code reviews, meetings, design, research, documentation).
   - Late Afternoon (16:30 - 18:30): Tactical execution, bug verification, testing, or skill-building sprints.
   - Evening (19:00 - 21:30): Dinner (45-60m) followed by low-intensity review, reading, or wind-down. Never schedule high-stress tasks late at night.

2. Realistic Pacing & Human Breathing Room:
   - Never schedule rigid, unbroken conveyor-belt chains. Humans need transitions.
   - Provide natural buffer periods (10-20 min) or dedicated recharge pauses between demanding blocks.
   - Sprints should typically be 45-75 min (up to 90 min max for deep flow) followed by a 10-15 min break.

3. Task Duration Estimation & Complexity:
   - Deep engineering/development (e.g. coding, leetcode, debugging): 60-90 min.
   - Design, writing, and research: 45-60 min.
   - Quick administrative, standup, review tasks: 15-30 min.
   - Meals: Lunch 45-60 min, Dinner 45-60 min, Breakfast 30 min.

4. Actionable Focus Subtitles:
   - For every task, generate a specific, practical execution technique in the "subtitle" field (e.g. "Pomodoro 50/10: Isolate single unit test & silence notifications", "Active Recall: Solve 2 mediums before checking hints", "Timeboxed 30m: Review PR changes and test edge cases").

5. Output Format:
   Output ONLY a valid JSON array of objects. No markdown formatting, no explanations, no text outside the JSON.
   Structure:
   [
     {
       "dateStr": "YYYY-MM-DD",
       "title": "Specific task title",
       "category": "development" | "research" | "meeting" | "design" | "writing" | "meal" | "break" | "other",
       "startHour": <0-23>,
       "startMinute": <0-59>,
       "durationMinutes": <15-120>,
       "priority": "high" | "medium" | "low",
       "subtitle": "Actionable focus technique"
     }
   ]

6. Time & Boundary Constraints:
   - For today ({currentHour}:{currentMinuteFormatted}), all items must start strictly at or after {currentHour}:{currentMinuteFormatted}. Never schedule in the past.
   - Distribute the remaining available hours thoughtfully without squeezing impossible workloads.
   - Assign the highest priority and prime timeslots to the user's specified high-priority tasks.`;

export const extractJSONFromAIResponse = <T = any>(rawText: string): T => {
    let clean = (rawText || '').trim();
    if (clean.includes('```')) {
        const matches = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (matches && matches[1]) {
            clean = matches[1].trim();
        }
    }
    const firstBracket = clean.search(/[[{]/);
    if (firstBracket !== -1) {
        const isArray = clean[firstBracket] === '[';
        const lastBracket = isArray ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
        if (lastBracket > firstBracket) {
            clean = clean.substring(firstBracket, lastBracket + 1);
        }
    }

    clean = clean.replace(/,\s*([\]}])/g, '$1');

    try {
        return JSON.parse(clean);
    } catch {
        log('warn', 'Failed to parse JSON from AI response, returning empty result');
        return [] as unknown as T;
    }
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

    const todayDateStr = new Date().toISOString().split('T')[0];
    const currentTotalMins = request.currentHour * 60 + request.currentMinute;

    const sanitized: PlannedRoutineItem[] = [];

    for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (!item || typeof item !== 'object') continue;

        const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Focus Block ${i + 1}`;
        const rawCat = (item.category || '').toLowerCase().trim();
        const category: PlannedRoutineItem['category'] = validCategories.includes(rawCat as any) ? rawCat as any : 'development';
        const priority: PlannedRoutineItem['priority'] = ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'high';

        const hasExplicitDate = typeof item.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dateStr.trim());
        let itemDateStr = hasExplicitDate ? item.dateStr.trim() : '';

        if (request.targetDates && request.targetDates.length > 0) {
            if (!hasExplicitDate || !request.targetDates.includes(itemDateStr)) {
                itemDateStr = request.targetDates[i % request.targetDates.length];
            }
        } else if (!itemDateStr) {
            itemDateStr = request.targetDateStr;
        }

        const isItemToday = itemDateStr === todayDateStr;
        const [y, m, d] = itemDateStr.split('-').map(Number);
        const dayIndex = !isNaN(y) && !isNaN(m) && !isNaN(d) ? new Date(y, m - 1, d).getDay() : new Date().getDay();

        let startHour = typeof item.startHour === 'number' && !isNaN(item.startHour) ? Math.max(0, Math.min(23, Math.floor(item.startHour))) : request.currentHour;
        let startMinute = typeof item.startMinute === 'number' && !isNaN(item.startMinute) ? Math.max(0, Math.min(59, Math.floor(item.startMinute))) : 0;
        const durationMinutes = typeof item.durationMinutes === 'number' && !isNaN(item.durationMinutes) ? Math.max(15, Math.min(180, Math.floor(item.durationMinutes))) : 45;

        if (isItemToday) {
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
            dateStr: itemDateStr,
            startHour,
            startMinute,
            durationMinutes,
            completed: false,
            subtitle: item.subtitle ? String(item.subtitle).trim() : undefined
        });
    }

    const grouped = new Map<string, PlannedRoutineItem[]>();
    for (const item of sanitized) {
        const list = grouped.get(item.dateStr) || [];
        list.push(item);
        grouped.set(item.dateStr, list);
    }

    const resolved: PlannedRoutineItem[] = [];
    for (const [, itemsForDate] of grouped) {
        resolved.push(...resolveCollisionsSequentially(itemsForDate));
    }

    return resolved;
};

export interface CompiledSchedulePrompts {
    systemPrompt: string;
    userPrompt: string;
    summary: {
        scope: 'day' | 'week';
        targetDates: string[];
        taskCount: number;
        budgetHours: number;
        startTime: string;
        meals: string[];
    };
}

export const compileCalendarSchedulePrompts = (
    request: CalendarScheduleRequest
): CompiledSchedulePrompts => {
    const tz = request.timezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Local Time');
    const currentMinStr = request.currentMinute < 10 ? `0${request.currentMinute}` : `${request.currentMinute}`;
    const timePrompt = `${request.currentHour}:${currentMinStr}`;

    const formattedTasks = (request.tasks || []).map((t, idx) => {
        const title = t?.title || 'Task';
        const cat = t?.category ? ` [${t.category}]` : '';
        const prio = (t?.priority && typeof t.priority === 'string') ? ` [Priority: ${t.priority.toUpperCase()}]` : '';
        return `${idx + 1}. "${title}"${cat}${prio}`;
    }).join('\n');

    const meals: string[] = [];
    if (request.includeBreakfast) meals.push('Breakfast (30m)');
    if (request.includeLunch) meals.push('Lunch (45-60m)');
    if (request.includeDinner) meals.push('Dinner (45-60m)');
    if (request.includeRestBlocks) meals.push('Rest & Hydration Buffers (10-15m)');

    let scopeDetails = '';
    if (request.planScope === 'week' && request.targetDates && request.targetDates.length > 0) {
        const datesList = request.targetDates.join(', ');
        scopeDetails = [
            `PLAN SCOPE: Multi-Day Weekly Schedule across ${request.targetDates.length} days [${datesList}].`,
            `TOTAL WEEKLY BUDGET: ~${request.totalWeeklyHours || 20} hours of productive engagement.`,
            `DISTRIBUTION DIRECTIVE: Distribute the tasks thoughtfully across these target dates. Prevent overloading any single day. Every item MUST have "dateStr" set to one of these valid dates: [${datesList}].`,
            `PACING: Start each day at ~${request.currentHour}:00, embedding meal slots and natural transition buffers between demanding work blocks.`
        ].join('\n');
    } else {
        const dayName = request.dayOfWeekName || 'Day';
        const dayType = request.isWeekend ? 'Weekend (Balance learning with restorative recovery)' : 'Weekday (High-leverage focus & execution momentum)';
        const timingLine = request.isToday
            ? `TIMING CONSTRAINT: Today is ${dayName} (${request.targetDateStr}). Current time is ${timePrompt} (${tz}). Schedule MUST start at or after ${timePrompt}. Never schedule items in the past.`
            : `TIMING CONSTRAINT: Target day is ${dayName} (${request.targetDateStr}). Day starts at ${request.currentHour}:00.`;

        scopeDetails = [
            `PLAN SCOPE: Single Day Routine for ${dayName} (${request.targetDateStr}) - ${dayType}.`,
            timingLine,
            `TIME BUDGET: User has allocated ${request.allottedHours || 6} hours of available focus time today.`
        ].join('\n');
    }

    const userInstructions = request.userPrompt && request.userPrompt.trim()
        ? `USER SPECIFIC GUIDANCE:\n"${request.userPrompt.trim()}"`
        : null;

    const userPromptLines = [
        `ENVIRONMENT CONTEXT:`,
        `- Timezone: ${tz}`,
        `- User Role: ${request.role || 'Productivity Practitioner'}`,
        ``,
        scopeDetails,
        ``,
        `TASKS TO SCHEDULE:`,
        request.tasks && request.tasks.length > 0
            ? formattedTasks
            : `(No specific task list provided. Craft an optimal productive day flow with deep focus, research, and breaks.)`,
        ``,
        `NUTRITION & RECOVERY PREFERENCES:`,
        meals.length > 0 ? `- Include: ${meals.join(', ')}` : `- No meal or break preferences requested.`,
        ``,
        userInstructions,
        ``,
        `SCHEDULING EXECUTION DIRECTIVES:`,
        `1. Sizing: Size cognitive deep-work tasks realistically (45-90 min). For quick reviews or admin tasks, use 15-30 min.`,
        `2. Breathing Room: Insert 10-20 min buffer intervals between separate demanding blocks to avoid conveyor-belt burnout.`,
        `3. Subtitles: Provide an actionable, high-performance technique for each task (e.g. "Pomodoro 50/10: Isolate edge cases", "Active Recall: Solve before reviewing answers").`,
        `4. Strict Output: Return ONLY the raw JSON array of objects. No markdown wrappers, no introductory or concluding explanations.`
    ].filter((line) => line !== null).join('\n');

    const systemPromptTemplate = request.customSystemPrompt && request.customSystemPrompt.trim()
        ? request.customSystemPrompt.trim()
        : CALENDAR_SCHEDULER_SYSTEM_PROMPT;

    const systemPrompt = systemPromptTemplate
        .replace('{currentHour}', String(request.currentHour))
        .replace('{currentMinuteFormatted}', currentMinStr);

    return {
        systemPrompt,
        userPrompt: userPromptLines,
        summary: {
            scope: request.planScope || 'day',
            targetDates: request.planScope === 'week' && request.targetDates ? request.targetDates : [request.targetDateStr],
            taskCount: request.tasks ? request.tasks.length : 0,
            budgetHours: (request.planScope === 'week' ? request.totalWeeklyHours : request.allottedHours) || 6,
            startTime: timePrompt,
            meals,
        },
    };
};

export const generateAICalendarSchedule = async (
    engine: any,
    request: CalendarScheduleRequest
): Promise<PlannedRoutineItem[]> => {
    const compiled = compileCalendarSchedulePrompts(request);

    const userPromptContent = request.compiledUserPrompt && request.compiledUserPrompt.trim()
        ? request.compiledUserPrompt.trim()
        : compiled.userPrompt;

    const systemPromptContent = request.customSystemPrompt && request.customSystemPrompt.trim()
        ? request.customSystemPrompt.trim()
        : compiled.systemPrompt;

    const messages = [
        {
            role: 'system',
            content: systemPromptContent
        },
        {
            role: 'user',
            content: userPromptContent
        }
    ];

    try {
        const rawResponse = await generateCompletion(engine, messages, 0.4);
        const parsed = extractJSONFromAIResponse<any[]>(rawResponse);
        return sanitizeAndValidateScheduleItems(parsed, request);
    } catch (e: any) {
        const friendly = parseAIErrorMessage(e);
        log('warn', 'generateAICalendarSchedule failed:', friendly);
        const wrapped = new Error(friendly);
        (wrapped as any).originalError = e;
        throw wrapped;
    }
};
