import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import {
    AVAILABLE_MODELS,
    hasModelInCache,
    hasPartialModelCache,
    getModelCacheUsageMB,
    deleteModelFromCache,
    getAvailableStorageEstimate,
    parseModelSizeToMB,
    MODELS_CHANGED_EVENT,
    AIModel,
} from '../lib/ai';
import { Trash2, X, Settings, Loader2 } from 'lucide-react';
import { aiNudgeService } from '../lib/aiNudgeService';
import { ExternalModelPanel } from './ExternalModelPanel';
import type { ExternalAIConfig } from '../global';

interface ModelManagerProps {
    /** Model id currently loaded into WebGPU, if any */
    activeModelId?: string;
    /** Called when the user confirms a model that differs from the running one */
    onApply: (modelId: string) => void;
    onEditPrompt: () => void;
    onClose: () => void;
    /** Unloads the running engine after its model files were deleted */
    onUnloadActive?: () => Promise<void> | void;
    externalConfig: ExternalAIConfig | null;
    /** An API model is the one currently in use */
    externalActive: boolean;
    onExternalConfigChange: (config: ExternalAIConfig | null) => void;
    onUseExternal: (config: ExternalAIConfig) => Promise<void> | void;
}

const formatMB = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);
const formatSize = (model: AIModel) => formatMB(parseModelSizeToMB(model.size));

export const ModelManager = ({
    activeModelId,
    onApply,
    onEditPrompt,
    onClose,
    onUnloadActive,
    externalConfig,
    externalActive,
    onExternalConfigChange,
    onUseExternal,
}: ModelManagerProps) => {
    const [tab, setTab] = useState<'local' | 'api'>(externalActive ? 'api' : 'local');
    const { selectedModelId, setSelectedModel } = useStore();
    const [installed, setInstalled] = useState<Set<string>>(new Set());
    // Interrupted downloads: model id -> MB of leftover files on disk
    const [partialMB, setPartialMB] = useState<Record<string, number>>({});
    const [freeMB, setFreeMB] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const checkCacheStatus = async () => {
        const status = new Set<string>();
        const partial: Record<string, number> = {};
        for (const model of AVAILABLE_MODELS) {
            if (await hasModelInCache(model.id)) {
                status.add(model.id);
            } else if (await hasPartialModelCache(model.id)) {
                partial[model.id] = await getModelCacheUsageMB(model.id);
            }
        }
        setInstalled(status);
        setPartialMB(partial);
        const est = await getAvailableStorageEstimate();
        setFreeMB(est ? est.freeMB : null);
        aiNudgeService.refreshModelCacheStatus();
    };

    useEffect(() => {
        checkCacheStatus();
        window.addEventListener(MODELS_CHANGED_EVENT, checkCacheStatus);
        return () => window.removeEventListener(MODELS_CHANGED_EVENT, checkCacheStatus);
    }, []);

    const handleDelete = async (modelId: string) => {
        setDeletingId(modelId);
        try {
            await deleteModelFromCache(modelId);
            await checkCacheStatus();
            // Weights are already in GPU memory, so unload only after the files are gone
            if (modelId === activeModelId) await onUnloadActive?.();
        } catch (error) {
            console.error('Failed to delete model:', error);
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const chosenId = selectedModelId || activeModelId || AVAILABLE_MODELS[0].id;
    const chosen = AVAILABLE_MODELS.find((m) => m.id === chosenId) || AVAILABLE_MODELS[0];
    const chosenInstalled = installed.has(chosen.id);
    const onDevice = AVAILABLE_MODELS.filter((m) => installed.has(m.id));
    const downloadable = AVAILABLE_MODELS.filter((m) => !installed.has(m.id));
    const usedMB =
        onDevice.reduce((sum, m) => sum + parseModelSizeToMB(m.size), 0) +
        Object.values(partialMB).reduce((sum, mb) => sum + mb, 0);
    const tooBig = (m: AIModel) => freeMB !== null && parseModelSizeToMB(m.size) > freeMB;

    const primaryLabel =
        chosen.id === activeModelId
            ? 'Done'
            : chosenInstalled
              ? `Switch to ${chosen.name}`
              : `Download ${chosen.name} (${formatSize(chosen)})`;
    const primaryDisabled = !chosenInstalled && tooBig(chosen);

    const renderRow = (model: AIModel) => {
        const isChosen = model.id === chosen.id;
        const isRunning = model.id === activeModelId;
        const isInstalled = installed.has(model.id);
        const leftoverMB = partialMB[model.id];
        const isPartial = leftoverMB !== undefined;
        const noRoom = !isInstalled && tooBig(model);

        if (confirmDeleteId === model.id) {
            const question = isPartial
                ? `Clear the unfinished download of ${model.name}?`
                : isRunning
                  ? `Unload and delete ${model.name} (${formatSize(model)})?`
                  : `Delete ${model.name} (${formatSize(model)})?`;
            return (
                <li key={model.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-rose-500/10">
                    <p className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>
                        {question}
                    </p>
                    {deletingId === model.id ? (
                        <Loader2 size={14} className="animate-spin text-rose-400" />
                    ) : (
                        <>
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs px-2 py-1 rounded-md hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Keep
                            </button>
                            <button
                                autoFocus
                                onClick={() => handleDelete(model.id)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-500 text-white hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300"
                            >
                                {isPartial ? 'Clear' : 'Delete'}
                            </button>
                        </>
                    )}
                </li>
            );
        }

        const detail = isPartial
            ? `Unfinished download, ${formatMB(leftoverMB)} on disk`
            : noRoom
              ? `Not enough free space (${formatMB(freeMB!)} left)`
              : model.description;

        return (
            <li key={model.id} className="flex items-stretch gap-1">
                <button
                    role="radio"
                    aria-checked={isChosen}
                    onClick={() => setSelectedModel(model.id)}
                    className="flex-1 min-w-0 flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-[var(--bg-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                    style={{ background: isChosen ? 'var(--bg-elevated)' : undefined }}
                >
                    <span
                        aria-hidden
                        className="mt-[3px] w-3.5 h-3.5 shrink-0 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: isChosen ? 'var(--accent)' : 'var(--border-primary)' }}
                    >
                        {isChosen && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </span>
                    <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2">
                            <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {model.name}
                            </span>
                            {isRunning && (
                                <span className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Running
                                </span>
                            )}
                            <span
                                className="ml-auto text-[12px] tabular-nums shrink-0"
                                style={{ color: noRoom ? '#f59e0b' : 'var(--text-muted)' }}
                            >
                                {formatSize(model)}
                            </span>
                        </span>
                        <span
                            className="block text-[12px] leading-snug mt-0.5 truncate"
                            style={{ color: isPartial ? '#f59e0b' : 'var(--text-muted)' }}
                        >
                            {detail}
                        </span>
                    </span>
                </button>
                {/* Fixed-width end column keeps sizes aligned whether or not a row can be deleted */}
                <span className="w-8 shrink-0 flex items-center justify-center">
                    {(isInstalled || isPartial) && (
                        <button
                            onClick={() => setConfirmDeleteId(model.id)}
                            aria-label={isPartial ? `Clear unfinished download of ${model.name}` : `Delete ${model.name} from this device`}
                            title={isPartial ? 'Clear unfinished download' : 'Delete model files from this device'}
                            className="p-1.5 rounded-md transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </span>
            </li>
        );
    };

    const usedPct = freeMB !== null && usedMB + freeMB > 0 ? (usedMB / (usedMB + freeMB)) * 100 : 0;

    const promptButton = (
        <button
            onClick={onEditPrompt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium hover:bg-[var(--bg-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
            title="Edit the AI system prompt"
        >
            <Settings size={13} />
            Prompt
        </button>
    );

    const tabButton = (value: 'local' | 'api', label: string, running: boolean) => (
        <button
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            style={{
                background: tab === value ? 'var(--bg-card-solid)' : 'transparent',
                color: tab === value ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
        >
            {label}
            {running && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-label="in use" />}
        </button>
    );

    return (
        <div className="flex flex-col max-h-[min(640px,80vh)]">
            <header className="flex items-center justify-between px-4 pt-4 pb-3">
                <h4 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    AI model
                </h4>
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1 -mr-1 rounded-md hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <X size={16} />
                </button>
            </header>

            <div role="tablist" aria-label="Where the AI runs" className="mx-4 mb-3 p-0.5 flex gap-0.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
                {tabButton('local', 'On this device', !!activeModelId)}
                {tabButton('api', 'API', externalActive)}
            </div>

            {tab === 'api' ? (
                <ExternalModelPanel
                    config={externalConfig}
                    active={externalActive}
                    onConfigChange={onExternalConfigChange}
                    onUse={onUseExternal}
                    onClose={onClose}
                    promptButton={promptButton}
                />
            ) : (
                <>
                    {/* Disk usage: the reason a download can fail, shown before it does */}
                    <div className="px-4 pb-3">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                            <div
                                className="h-full rounded-full transition-[width] duration-500"
                                style={{ width: `${Math.max(usedPct, usedMB > 0 ? 2 : 0)}%`, background: 'var(--accent)' }}
                            />
                        </div>
                        <p className="mt-1.5 text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                            {usedMB > 0 ? `Models use ${formatMB(usedMB)}` : 'No models installed yet'}
                            {freeMB !== null && <span>, {formatMB(freeMB)} free</span>}
                        </p>
                    </div>

                    <div role="radiogroup" aria-label="AI model" className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
                        {onDevice.length > 0 && (
                            <section className="mb-2">
                                <h5 className="px-3 pt-1 pb-1 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    On this device
                                </h5>
                                <ul className="space-y-0.5">{onDevice.map(renderRow)}</ul>
                            </section>
                        )}
                        <section>
                            <h5 className="px-3 pt-1 pb-1 text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Available to download
                            </h5>
                            <ul className="space-y-0.5">{downloadable.map(renderRow)}</ul>
                        </section>
                    </div>

                    <footer className="flex gap-2 p-3 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                        <button
                            onClick={() => (chosen.id === activeModelId ? onClose() : onApply(chosen.id))}
                            disabled={primaryDisabled}
                            className="flex-1 min-w-0 truncate py-2 px-3 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                            style={{ background: 'var(--accent)' }}
                        >
                            {primaryLabel}
                        </button>
                        {promptButton}
                    </footer>
                </>
            )}
        </div>
    );
};
