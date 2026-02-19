/// <reference types="@webgpu/types" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";


export interface AIModel {
    id: string;
    name: string;
    size: string;
    description: string;
    family: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
    {
        id: "gemma-2-2b-it-q4f32_1-MLC",
        name: "Gemma 2 2B",
        size: "1.3GB",
        description: "Google's lightweight model. Fast & follows instructions well.",
        family: "gemma"
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
        const cache = await caches.open('webllm/model');
        const keys = await cache.keys();
        // Check if any key contains the modelId (basic check)
        return keys.some(req => req.url.includes(modelId));
    } catch (e) {
        return false;
    }
};

export const deleteModelFromCache = async (modelId: string): Promise<void> => {
    try {
        log('info', `Attempting to delete model: ${modelId}`);
        const cache = await caches.open('webllm/model');
        const keys = await cache.keys();
        
        const deletions = keys
            .filter(req => req.url.includes(modelId))
            .map(req => cache.delete(req));
        
        await Promise.all(deletions);
        log('info', `Deleted ${deletions.length} files for ${modelId}`);
    } catch (e) {
        log('error', 'Failed to delete model from cache', e);
        throw e;
    }
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
        throw new Error("WebGPU is not supported on this device.");
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
                
                // If specific model was requested and failed, throw immediately
                if (selectedModelId) {
                    throw new Error(`Failed to load ${currentModel}: ${errorMsg}`);
                }
            }
        }
    }

    // All models failed
    log('error', '❌ All models failed to load');
    throw new Error("Failed to initialize AI engine. Please check your connection or try a different model.");
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
