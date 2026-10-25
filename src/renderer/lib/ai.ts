/// <reference types="@webgpu/types" />
import {
    CreateMLCEngine,
    hasModelInCache as webllmHasModelInCache,
    deleteModelAllInfoInCache,
    prebuiltAppConfig,
} from "@mlc-ai/web-llm";
import { PlannedRoutineItem } from '../types/routine';
import { layoutHumanDay } from './smartScheduler';

export const CACHED_MODELS_STORAGE_KEY = 'produchive_downloaded_models';

// Fired on window when a model is installed or removed so UI can refresh its "installed" status
export const MODELS_CHANGED_EVENT = 'produchive:ai-models-changed';

const notifyModelsChanged = () => {
    try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new Event(MODELS_CHANGED_EVENT));
        }
    } catch {}
};

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
/**
 * True only when every weight shard of the model is in web-llm's cache, so loading
 * will not hit the network. A partially downloaded model (interrupted download, disk
 * full) is NOT installed: web-llm would re-fetch the missing shards on load.
 * The localStorage marker is only a fallback where the Cache API is unavailable.
 */
export const hasModelInCache = async (modelId: string): Promise<boolean> => {
    if (typeof caches === 'undefined') {
        return getPersistedDownloadedModels().includes(modelId);
    }
    try {
        const cached = await webllmHasModelInCache(modelId, prebuiltAppConfig);
        if (cached) {
            markModelDownloaded(modelId);
        } else {
            unmarkModelDownloaded(modelId);
        }
        return cached;
    } catch (e) {
        log('warn', `Cache check failed for ${modelId}`, e);
        return getPersistedDownloadedModels().includes(modelId);
    }
};

/**
 * Ask Chromium to mark this origin's storage as persistent so multi-GB model
 * files are never evicted under storage pressure.
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
    try {
        if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
        if (await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
    } catch {
        return false;
    }
};

export const getAnyPersistedDownloadedModelId = (): string | null => {
    try {
        const persisted = getPersistedDownloadedModels();
        if (persisted.length > 0) {
            const match = AVAILABLE_MODELS.find(m => persisted.includes(m.id));
            if (match) return match.id;
        }
    } catch {}
    return null;
};

export const hasAnyDownloadedModel = async (): Promise<string | null> => {
    try {
        // Check the previously installed model first, then everything else
        const syncId = getAnyPersistedDownloadedModelId();
        const candidates = syncId
            ? [syncId, ...AVAILABLE_MODELS.map(m => m.id).filter(id => id !== syncId)]
            : AVAILABLE_MODELS.map(m => m.id);
        for (const id of candidates) {
            if (await hasModelInCache(id)) return id;
        }
        return null;
    } catch {
        return null;
    }
};

// Cache entries belonging to a model: weights/tokenizer/config live under the model's
// Hugging Face folder, the compiled WebGPU library is named after its model_lib.
const isModelCacheUrl = (url: string, modelId: string): boolean => {
    if (url.includes(`/${modelId}/`)) return true;
    const lib = prebuiltAppConfig.model_list?.find((m: any) => m.model_id === modelId)?.model_lib;
    return !!lib && url === lib;
};

const listModelCacheEntries = async (modelId: string): Promise<{ cache: Cache; request: Request }[]> => {
    if (typeof caches === 'undefined') return [];
    const entries: { cache: Cache; request: Request }[] = [];
    for (const name of await caches.keys()) {
        if (!name.startsWith('webllm/')) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
            if (isModelCacheUrl(request.url, modelId)) entries.push({ cache, request });
        }
    }
    return entries;
};

/**
 * Disk used by a model's cached files, including leftovers from an interrupted
 * download. Returns 0 when nothing is cached.
 */
export const getModelCacheUsageMB = async (modelId: string): Promise<number> => {
    try {
        let bytes = 0;
        for (const { cache, request } of await listModelCacheEntries(modelId)) {
            const res = await cache.match(request);
            bytes += Number(res?.headers.get('content-length')) || 0;
        }
        return bytes / (1024 * 1024);
    } catch {
        return 0;
    }
};

/** True when some files of the model are cached but it is not fully installed. */
export const hasPartialModelCache = async (modelId: string): Promise<boolean> => {
    try {
        return (await listModelCacheEntries(modelId)).length > 0;
    } catch {
        return false;
    }
};

export const deleteModelFromCache = async (modelId: string): Promise<void> => {
    try {
        log('info', `Attempting to delete model: ${modelId}`);
        const fullyInstalled = await hasModelInCache(modelId);
        unmarkModelDownloaded(modelId);
        if (typeof caches !== 'undefined') {
            // web-llm's own cleanup reads tensor-cache.json, which may be missing (and
            // re-fetched) for a partial download, so only use it on complete installs.
            if (fullyInstalled) {
                await deleteModelAllInfoInCache(modelId, prebuiltAppConfig);
            }
            // Sweep whatever is left: partial shards, tokenizer, config, wasm
            const leftovers = await listModelCacheEntries(modelId);
            await Promise.all(leftovers.map(({ cache, request }) => cache.delete(request)));
            log('info', `Deleted cached files for ${modelId} (${leftovers.length} swept)`);
        }
    } catch (e) {
        log('error', 'Failed to delete model from cache', e);
        throw e;
    } finally {
        notifyModelsChanged();
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
    let isCached = false;
    if (selectedModelId) {
        isCached = await hasModelInCache(selectedModelId);
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
        
        const displayName = AVAILABLE_MODELS.find(m => m.id === currentModel)?.name || currentModel;
        progressCallback({
            text: isCached && currentModel === selectedModelId
                ? `${displayName} is installed. Loading from disk...`
                : `Initializing ${currentModel}...`,
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
                notifyModelsChanged();
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
    temperature = 0.7,
    signal?: AbortSignal,
    onToken?: (textSoFar: string) => void
) => {
    if (signal?.aborted) {
        const err = new Error("Operation cancelled by user");
        err.name = "AbortError";
        throw err;
    }

    if (!engine) {
        log('error', 'generateCompletion called with null engine');
        throw new Error("AI Engine not initialized: Please download and activate an on-device AI model.");
    }

    log('info', 'Generating completion...');
    log('info', 'Messages count:', messages.length);

    try {
        const startTime = Date.now();
        // Stream from the on-device engine when the caller wants live progress; API engines return in one go
        if (onToken && !engine.isExternal) {
            const chunks = await engine.chat.completions.create({
                messages,
                temperature,
                stream: true,
                ...(signal ? { signal } : {}),
            });
            let text = '';
            for await (const chunk of chunks) {
                if (signal?.aborted) break;
                const delta = chunk?.choices?.[0]?.delta?.content;
                if (delta) {
                    text += delta;
                    onToken(text);
                }
            }
            log('info', `Completion streamed in ${Date.now() - startTime}ms`);
            return text;
        }

        const completion = await engine.chat.completions.create({
            messages,
            temperature,
            ...(signal ? { signal } : {}),
        });
        const duration = Date.now() - startTime;

        log('info', `Completion generated in ${duration}ms`);
        return completion.choices[0]?.message?.content || "";
    } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError' || e?.message?.toLowerCase().includes('abort') || e?.message?.toLowerCase().includes('cancel')) {
            const abortErr = new Error("Operation cancelled by user");
            abortErr.name = "AbortError";
            throw abortErr;
        }
        const friendlyMsg = parseAIErrorMessage(e);
        log('error', 'Completion generation failed:', friendlyMsg);
        const wrappedErr = new Error(friendlyMsg);
        (wrappedErr as any).originalError = e;
        (wrappedErr as any).isInstanceError = isEngineInstanceError(e);
        throw wrappedErr;
    }
};

export const DEFAULT_PROMPT = `You are Produchive's on-device productivity coach for a {role}. You do two jobs: an honest analyst who judges how the user's tracked time served their goals, and a patient teacher who helps them do better in their next session.

How to judge
- Judge every activity against the user's goals and their role. The same app can be work for one person and a distraction for another: an IDE or terminal is core work for a Software Engineer; PDFs, docs and lecture notes are core work for students; Figma or Blender is core work for a designer.
- Active work (writing, coding, solving problems, practising, taking notes) counts more than passive consumption (watching, scrolling, browsing feeds).
- Videos, articles and searches are productive only when the title clearly relates to a goal. Entertainment, social media, games and shopping are distracting.
- Chat, email, file managers, settings and short searches are neutral unless their title shows goal-related work.
- Weigh by time. A few minutes off task barely matters; an hour does.

How to rate (1-10)
- 9-10: almost all time on goal work, with long focused stretches.
- 7-8: mostly goal work with small detours.
- 4-6: mixed, or too little tracked time to tell.
- 1-3: distractions took most of the time (about 40% or more).
Verdict: 7-10 is "productive", 4-6 is "neutral", 1-3 is "unproductive".

How to teach
- Be honest and kind. Name the real activities and their times. Never mention activities that are not in the list.
- Start with what went well, then name the one thing that cost the most time.
- Give tips the user can act on in their next session, tied to their goals and role. Prefer "Do 45 minutes on the React chapter before opening YouTube" over "Stay focused".
- No shaming, no generic motivation, no lectures.

Reply with JSON only, in exactly the format you are given.`;

// Earlier default, swapped for DEFAULT_PROMPT when a user never customised it
export const isLegacyDefaultPrompt = (prompt: string): boolean =>
    prompt.startsWith('You are a kind, encouraging, and supportive tutor and guide.') && prompt.includes('DISTINCTION GUIDANCE');

/** Fills placeholders in the user's system prompt. */
export const buildSystemPrompt = (customPrompt: string | undefined, role: string): string => {
    const base = customPrompt && customPrompt.trim() && !isLegacyDefaultPrompt(customPrompt) ? customPrompt : DEFAULT_PROMPT;
    return base.replace(/\{role\}/g, role);
};

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
    signal?: AbortSignal;
    /** Called while the on-device model streams, with the number of schedule items drafted so far */
    onProgress?: (itemsDrafted: number) => void;
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

    // Local date, not UTC, so "today" is right in every timezone
    const nowDate = new Date();
    const todayDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
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

    const isWeek = Boolean(request.targetDates && request.targetDates.length > 0);
    const workBudgetMins = isWeek
        ? (request.totalWeeklyHours ? Math.round((request.totalWeeklyHours * 60) / request.targetDates!.length) : undefined)
        : (request.allottedHours ? request.allottedHours * 60 : undefined);
    const nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();

    const resolved: PlannedRoutineItem[] = [];
    for (const [dateStr, itemsForDate] of grouped) {
        // The caller already moved the target day's start past "now"; other days of a week start on the hour
        let dayStartMins = dateStr === request.targetDateStr ? currentTotalMins : request.currentHour * 60;
        if (dateStr !== request.targetDateStr && dateStr === todayDateStr) dayStartMins = Math.max(dayStartMins, nowMins);
        resolved.push(...layoutHumanDay(itemsForDate, {
            dateStr,
            dayStartMins,
            workBudgetMins,
            includeBreakfast: request.includeBreakfast,
            includeLunch: request.includeLunch,
            includeDinner: request.includeDinner,
            includeRestBlocks: request.includeRestBlocks,
        }));
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
        `3. Subtitles: Provide a short actionable technique for each task, under 10 words (e.g. "Pomodoro 50/10: Isolate edge cases", "Active Recall: Solve before reviewing answers").`,
        `4. Strict Output: Return ONLY the raw JSON array of objects, one compact object per line with no indentation. No markdown wrappers, no introductory or concluding explanations.`
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
    if (request.signal?.aborted) {
        const abortErr = new Error("Operation cancelled by user");
        abortErr.name = "AbortError";
        throw abortErr;
    }

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
        const onToken = request.onProgress
            ? (text: string) => request.onProgress!((text.match(/"title"\s*:/g) || []).length)
            : undefined;
        const rawResponse = await generateCompletion(engine, messages, 0.4, request.signal, onToken);
        if (request.signal?.aborted) {
            const abortErr = new Error("Operation cancelled by user");
            abortErr.name = "AbortError";
            throw abortErr;
        }
        const parsed = extractJSONFromAIResponse<any[]>(rawResponse);
        return sanitizeAndValidateScheduleItems(parsed, request);
    } catch (e: any) {
        if (request.signal?.aborted || e?.name === 'AbortError' || e?.message?.toLowerCase().includes('abort') || e?.message?.toLowerCase().includes('cancel')) {
            const abortErr = new Error("Operation cancelled by user");
            abortErr.name = "AbortError";
            throw abortErr;
        }
        const friendly = parseAIErrorMessage(e);
        log('warn', 'generateAICalendarSchedule failed:', friendly);
        const wrapped = new Error(friendly);
        (wrapped as any).originalError = e;
        throw wrapped;
    }
};
