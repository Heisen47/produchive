import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ExternalAIConfig, ExternalAIProvider } from '../global';
import { PROVIDER_LABELS, PROVIDER_GROUPS, isLocalProvider } from '../lib/externalEngine';

interface ProviderForm {
    defaultModel?: string;
    defaultUrl?: string;
    needsKey: boolean;
    keyOptional?: boolean;
}

const cloud: ProviderForm = { needsKey: true };

// Mirrors PROVIDERS in src/externalAI.ts; the main process enforces the URLs
const PROVIDER_FORMS: Record<ExternalAIProvider, ProviderForm> = {
    anthropic: { needsKey: true, defaultModel: 'claude-opus-5-5' },
    openai: cloud,
    gemini: cloud,
    openrouter: cloud,
    groq: cloud,
    mistral: cloud,
    deepseek: cloud,
    xai: cloud,
    together: cloud,
    perplexity: cloud,
    ollama: { needsKey: false, defaultUrl: 'http://localhost:11434/v1' },
    lmstudio: { needsKey: false, defaultUrl: 'http://localhost:1234/v1' },
    custom: { needsKey: false, keyOptional: true, defaultUrl: '' },
};

const errorText = (e: any) => String(e?.message || e).replace(/^.*Error: /, '');

interface ExternalModelPanelProps {
    config: ExternalAIConfig | null;
    /** An API model is the one currently in use */
    active: boolean;
    onConfigChange: (config: ExternalAIConfig | null) => void;
    onUse: (config: ExternalAIConfig) => Promise<void> | void;
    onClose: () => void;
    promptButton: React.ReactNode;
}

const inputClass =
    'w-full px-3 py-2 rounded-lg text-[13px] border bg-transparent focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]';
const inputStyle = { color: 'var(--text-primary)', borderColor: 'var(--border-primary)', background: 'var(--bg-input)' };

const Field = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label htmlFor={htmlFor} className="block text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {label}
        </label>
        {children}
    </div>
);

export const ExternalModelPanel = ({ config, active, onConfigChange, onUse, onClose, promptButton }: ExternalModelPanelProps) => {
    const [provider, setProvider] = useState<ExternalAIProvider>(config?.provider || 'anthropic');
    const [model, setModel] = useState(config?.model || PROVIDER_FORMS.anthropic.defaultModel);
    const [baseUrl, setBaseUrl] = useState(config?.baseUrl || '');
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<string[]>([]);
    const [modelsStatus, setModelsStatus] = useState<{ loading: boolean; message?: string }>({ loading: false });

    const form = PROVIDER_FORMS[provider];
    const sameProvider = config?.provider === provider;
    const hasSavedKey = sameProvider && !!config?.hasKey;
    const showUrl = form.defaultUrl !== undefined;
    const showKey = form.needsKey || form.keyOptional;

    // Picking another provider resets its fields to that provider's defaults
    useEffect(() => {
        if (sameProvider) {
            setModel(config!.model);
            setBaseUrl(config!.baseUrl);
        } else {
            setModel(form.defaultModel || '');
            setBaseUrl(form.defaultUrl || '');
        }
        setApiKey('');
        setError(null);
        setModels([]);
        setModelsStatus({ loading: false });
        // Look up models right away when no new key is needed to do so
        if (!form.needsKey || (sameProvider && config?.hasKey)) {
            loadModels(sameProvider ? config!.baseUrl : form.defaultUrl);
        }
    }, [provider]);

    // urlOverride: state from this render may still hold the previous provider's URL
    const loadModels = async (urlOverride?: string) => {
        setModelsStatus({ loading: true });
        try {
            const ids = await window.electronAPI.externalAIListModels({
                provider,
                baseUrl: showUrl ? urlOverride ?? baseUrl.trim() : undefined,
                apiKey: apiKey.trim() || undefined,
            });
            setModels(ids);
            setModelsStatus({
                loading: false,
                message: ids.length ? `${ids.length} models available. Start typing to filter.` : 'No models found',
            });
        } catch (e: any) {
            setModels([]);
            setModelsStatus({
                loading: false,
                message: isLocalProvider(provider) ? `Is ${PROVIDER_LABELS[provider]} running? ${errorText(e)}` : errorText(e),
            });
        }
    };

    const unchanged = active && sameProvider && model.trim() === config?.model && !apiKey && (!showUrl || baseUrl === config?.baseUrl);
    const missingKey = form.needsKey && !apiKey.trim() && !hasSavedKey;
    const canSubmit = !!model.trim() && !missingKey && (!showUrl || !!baseUrl.trim());

    const save = async (keyChange?: string | null) => {
        setSaving(true);
        setError(null);
        try {
            const saved = await window.electronAPI.externalAISaveConfig({
                provider,
                model: model.trim(),
                baseUrl: showUrl ? baseUrl.trim() : undefined,
                apiKey: keyChange,
            });
            onConfigChange(saved);
            setApiKey('');
            return saved;
        } catch (e: any) {
            // ipcRenderer.invoke wraps main-process errors: "Error invoking remote method '…': Error: <msg>"
            setError(errorText(e));
            return null;
        } finally {
            setSaving(false);
        }
    };

    const handleUse = async () => {
        if (unchanged) return onClose();
        const saved = await save(apiKey.trim() || undefined);
        if (saved?.configured) await onUse(saved);
    };

    return (
        <>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-3 space-y-3">
                <Field label="Provider" htmlFor="ext-provider">
                    <select
                        id="ext-provider"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as ExternalAIProvider)}
                        className={inputClass}
                        style={inputStyle}
                    >
                        {PROVIDER_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                                {group.providers.map((p) => (
                                    <option key={p} value={p}>
                                        {PROVIDER_LABELS[p]}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </Field>

                <Field label="Model" htmlFor="ext-model">
                    <input
                        id="ext-model"
                        list="ext-model-options"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={models.length ? 'Pick or type a model' : 'Model name'}
                        spellCheck={false}
                        autoComplete="off"
                        className={inputClass}
                        style={inputStyle}
                    />
                    <datalist id="ext-model-options">
                        {models.map((id) => (
                            <option key={id} value={id} />
                        ))}
                    </datalist>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {modelsStatus.loading ? (
                            <>
                                <Loader2 size={12} className="animate-spin" /> Loading models…
                            </>
                        ) : (
                            <>
                                {modelsStatus.message && <span className="truncate">{modelsStatus.message}</span>}
                                <button
                                    onClick={() => loadModels()}
                                    disabled={form.needsKey && !apiKey.trim() && !hasSavedKey}
                                    className="ml-auto shrink-0 hover:underline disabled:opacity-40 disabled:no-underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                                    style={{ color: 'var(--accent)' }}
                                >
                                    {models.length ? 'Refresh list' : 'Show available models'}
                                </button>
                            </>
                        )}
                    </div>
                </Field>

                {showUrl && (
                    <Field label="Server URL" htmlFor="ext-url">
                        <input
                            id="ext-url"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://api.example.com/v1"
                            spellCheck={false}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </Field>
                )}

                {showKey && (
                    <Field label={form.keyOptional ? 'API key (if your server needs one)' : 'API key'} htmlFor="ext-key">
                        <input
                            id="ext-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={hasSavedKey ? 'Saved. Paste a new key to replace it' : 'Paste your API key'}
                            autoComplete="off"
                            spellCheck={false}
                            className={inputClass}
                            style={inputStyle}
                        />
                        {hasSavedKey && (
                            <button
                                onClick={() => save(null)}
                                disabled={saving}
                                className="text-[12px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] rounded"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Remove saved key
                            </button>
                        )}
                    </Field>
                )}

                <p className="text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                    {isLocalProvider(provider)
                        ? 'Runs on your own computer. Nothing leaves this device.'
                        : 'Your goals and activity summaries are sent to this provider when the AI runs. The key is stored encrypted in your system keychain.'}
                </p>

                {error && (
                    <p role="alert" className="text-[12px] text-rose-400">
                        {error}
                    </p>
                )}
            </div>

            <footer className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                <button
                    onClick={handleUse}
                    disabled={saving || (!unchanged && !canSubmit)}
                    className="flex-1 min-w-0 truncate flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    style={{ background: 'var(--accent)' }}
                >
                    {saving && <Loader2 size={13} className="animate-spin" />}
                    {unchanged ? 'Done' : `Use ${model.trim() || 'this model'}`}
                </button>
                {promptButton}
            </footer>
        </>
    );
};
