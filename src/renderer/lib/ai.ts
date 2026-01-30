/// <reference types="@webgpu/types" />
import { CreateMLCEngine } from "@mlc-ai/web-llm";

// Using Llama-3-8B-Instruct via 4-bit quantization, optimized for WebGPU
const SELECTED_MODEL = "Llama-3.1-8B-Instruct-q4f32_1-MLC";

export const initEngine = async (progressCallback: (report: any) => void) => {
    // Check if WebGPU is available
    if (!navigator.gpu) {
        throw new Error("WebGPU is not supported on this device.");
    }

    const engine = await CreateMLCEngine(
        SELECTED_MODEL,
        { initProgressCallback: progressCallback }
    );
    return engine;
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
