/// <reference types="@webgpu/types" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Using Qwen2.5-0.5B with f32 quantization (no shader-f16 required)
const SELECTED_MODEL = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const initEngine = async (progressCallback: (report: any) => void) => {
    // Check if WebGPU is available
    if (!navigator.gpu) {
        throw new Error("WebGPU is not supported on this device.");
    }

    // Verify GPU adapter and device are accessible
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No WebGPU adapter found. Please check your GPU drivers.");
        }
        const device = await adapter.requestDevice();
        if (!device) {
            throw new Error("Failed to acquire WebGPU device.");
        }
        // Release the test device
        device.destroy();
    } catch (e: any) {
        throw new Error(`WebGPU initialization failed: ${e.message}`);
    }

    // Attempt to create engine with retries
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            progressCallback({ text: attempt > 1 ? `Retry attempt ${attempt}/${MAX_RETRIES}...` : 'Initializing...' });

            const engine = await CreateMLCEngine(
                SELECTED_MODEL,
                { initProgressCallback: progressCallback }
            );
            return engine;
        } catch (e: any) {
            lastError = e;
            const errorMsg = e.message || String(e);

            // Check for recoverable WebGPU errors
            if (errorMsg.includes('Instance dropped') || errorMsg.includes('device lost')) {
                if (attempt < MAX_RETRIES) {
                    progressCallback({ text: `GPU context lost. Retrying in ${RETRY_DELAY_MS / 1000}s...` });
                    await sleep(RETRY_DELAY_MS);
                    continue;
                }
            }

            // Non-recoverable error, throw immediately
            throw e;
        }
    }

    throw lastError || new Error("Failed to initialize AI engine after multiple attempts");
};

export const generateCompletion = async (
    engine: any,
    messages: { role: string; content: string }[],
    temperature = 0.7
) => {
    if (!engine) {
        throw new Error("Engine not initialized");
    }

    const completion = await engine.chat.completions.create({
        messages,
        temperature,
    });

    return completion.choices[0]?.message?.content || "";
};
