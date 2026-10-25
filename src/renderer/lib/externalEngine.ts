import type { ExternalAIConfig, ExternalAIProvider } from '../global';

export const AI_SOURCE_STORAGE_KEY = 'produchive_ai_source';
export type AISource = 'local' | 'external';

export const PROVIDER_LABELS: Record<ExternalAIProvider, string> = {
    anthropic: 'Anthropic (Claude)',
    openai: 'OpenAI (GPT)',
    gemini: 'Google Gemini',
    openrouter: 'OpenRouter (many models, one key)',
    groq: 'Groq',
    mistral: 'Mistral AI',
    deepseek: 'DeepSeek',
    xai: 'xAI (Grok)',
    together: 'Together AI',
    perplexity: 'Perplexity',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
    custom: 'Custom server (OpenAI-compatible)',
};

export const PROVIDER_GROUPS: { label: string; providers: ExternalAIProvider[] }[] = [
    {
        label: 'Cloud',
        providers: ['anthropic', 'openai', 'gemini', 'openrouter', 'groq', 'mistral', 'deepseek', 'xai', 'together', 'perplexity'],
    },
    { label: 'On this computer (private)', providers: ['ollama', 'lmstudio'] },
    { label: 'Other', providers: ['custom'] },
];

/** Runs on this machine, so no data leaves it */
export const isLocalProvider = (provider: ExternalAIProvider) => provider === 'ollama' || provider === 'lmstudio';

export const getAISource = (): AISource => {
    try {
        return localStorage.getItem(AI_SOURCE_STORAGE_KEY) === 'external' ? 'external' : 'local';
    } catch {
        return 'local';
    }
};

export const setAISource = (source: AISource) => {
    try {
        localStorage.setItem(AI_SOURCE_STORAGE_KEY, source);
    } catch {}
};

export interface ExternalEngine {
    isExternal: true;
    config: ExternalAIConfig;
    chat: {
        completions: {
            create: (req: {
                messages: { role: string; content: string }[];
                temperature?: number;
                signal?: AbortSignal;
            }) => Promise<{ choices: { message: { content: string } }[] }>;
        };
    };
    interruptGenerate: () => void;
    unload: () => Promise<void>;
}

export const isExternalEngine = (engine: any): engine is ExternalEngine => !!engine?.isExternal;

/** Short label for the toolbar chip, e.g. "claude-opus-5-5" */
export const externalModelLabel = (config: ExternalAIConfig) => config.model;

const newRequestId = () => `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Same surface as web-llm's MLCEngine (`chat.completions.create`), so every existing
 * AI feature works unchanged. The request itself runs in the main process.
 */
export const createExternalEngine = (config: ExternalAIConfig): ExternalEngine => ({
    isExternal: true,
    config,
    chat: {
        completions: {
            create: async ({ messages, temperature, signal }) => {
                const requestId = newRequestId();
                const onAbort = () => window.electronAPI.externalAIAbort(requestId);
                signal?.addEventListener('abort', onAbort, { once: true });
                try {
                    const result = await window.electronAPI.externalAIChat({
                        requestId,
                        messages: messages.map((m) => ({ role: m.role, content: m.content })),
                        temperature,
                    });
                    if (result.aborted || signal?.aborted) {
                        const err = new Error('Operation cancelled by user');
                        err.name = 'AbortError';
                        throw err;
                    }
                    if (result.error) throw new Error(result.error);
                    return { choices: [{ message: { content: result.content || '' } }] };
                } finally {
                    signal?.removeEventListener('abort', onAbort);
                }
            },
        },
    },
    interruptGenerate: () => {
        window.electronAPI.externalAIAbort();
    },
    unload: async () => {
        await window.electronAPI.externalAIAbort();
    },
});
