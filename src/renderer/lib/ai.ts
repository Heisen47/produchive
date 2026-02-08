/// <reference types="@webgpu/types" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";


const MODEL_LIST = [
    "gemma-2-2b-it-q4f32_1-MLC",               // Primary: Gemma 2B - good instruction following
    "Phi-3.5-mini-instruct-q4f16_1-MLC",       // Fallback 1: Phi 3.5 mini
    "Llama-3.2-1B-Instruct-q4f32_1-MLC",       // Fallback 2: Llama 3.2 1B
    "TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC",    // Fallback 3: TinyLlama
];

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Logging utility
const log = (level: 'info' | 'warn' | 'error', ...args: any[]) => {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [AI]`, ...args);
};

export const initEngine = async (progressCallback: (report: any) => void) => {
    log('info', '========================================');
    log('info', 'Starting AI Engine Initialization');
    log('info', '========================================');

    // Check if WebGPU is available
    if (!navigator.gpu) {
        log('error', 'WebGPU is NOT supported on this device');
        throw new Error("WebGPU is not supported on this device.");
    }
    log('info', 'WebGPU is available');

    // Verify GPU adapter and device are accessible
    try {
        log('info', 'Requesting GPU adapter...');
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            log('error', 'No WebGPU adapter found');
            throw new Error("No WebGPU adapter found. Please check your GPU drivers.");
        }

        const adapterInfo = (adapter as any).requestAdapterInfo ? await (adapter as any).requestAdapterInfo() : { vendor: 'unknown' };
        log('info', 'GPU Adapter found:', adapterInfo);

        log('info', 'Requesting GPU device...');
        const device = await adapter.requestDevice();
        if (!device) {
            log('error', 'Failed to acquire WebGPU device');
            throw new Error("Failed to acquire WebGPU device.");
        }
        log('info', 'GPU device acquired successfully');

        // Release the test device
        device.destroy();
        log('info', 'Test device released');
    } catch (e: any) {
        log('error', 'WebGPU initialization failed:', e.message);
        throw new Error(`WebGPU initialization failed: ${e.message}`);
    }

    // Try each model in the fallback list
    for (let modelIndex = 0; modelIndex < MODEL_LIST.length; modelIndex++) {
        const currentModel = MODEL_LIST[modelIndex];
        log('info', `========================================`);
        log('info', `Trying model ${modelIndex + 1}/${MODEL_LIST.length}: ${currentModel}`);
        log('info', `========================================`);

        progressCallback({
            text: modelIndex > 0
                ? `Trying fallback model: ${currentModel}`
                : `Loading model: ${currentModel}`,
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
                log('info', '========================================');
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

                // If last retry for this model, try next model
                if (attempt === MAX_RETRIES) {
                    log('warn', `All retries exhausted for ${currentModel}`);
                    if (modelIndex < MODEL_LIST.length - 1) {
                        log('info', 'Trying next fallback model...');
                        progressCallback({ text: `${currentModel} failed. Trying fallback...` });
                        await sleep(1000);
                    }
                    break; // Move to next model
                }
            }
        }
    }

    // All models failed
    log('error', '❌ All models failed to load');
    log('error', 'Tried models:', MODEL_LIST);
    throw new Error("Failed to initialize AI engine. All models failed. Please check your GPU drivers and internet connection.");
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
