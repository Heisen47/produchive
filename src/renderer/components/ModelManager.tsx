import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { useTheme } from '../components/ThemeProvider';
import { AVAILABLE_MODELS, hasModelInCache, deleteModelFromCache, AIModel } from '../lib/ai';
import { Download, CheckCircle2, Trash2, HardDrive, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';

export const ModelManager = () => {
    const { isDark } = useTheme();
    const { selectedModelId, setSelectedModel } = useStore();
    const [cachedModels, setCachedModels] = useState<Set<string>>(new Set());
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Initial load checks
    useEffect(() => {
        checkCacheStatus();
    }, []);

    const checkCacheStatus = async () => {
        const status = new Set<string>();
        for (const model of AVAILABLE_MODELS) {
            const isCached = await hasModelInCache(model.id);
            if (isCached) status.add(model.id);
        }
        setCachedModels(status);
    };

    const handleDelete = async (e: React.MouseEvent, modelId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this model from cache? You will need to re-download it to use it again.')) return;

        setDeletingId(modelId);
        try {
            await deleteModelFromCache(modelId);
            await checkCacheStatus();
            
            // If deleting selected model, clear selection or fallback?
            // store.ts implementation allows null, initEngine handles default
        } catch (error) {
            console.error('Failed to delete model:', error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                AI Models
            </h3>
            
            <div className="grid gap-3">
                {AVAILABLE_MODELS.map((model) => {
                    const isSelected = selectedModelId === model.id || (!selectedModelId && model.id === AVAILABLE_MODELS[0].id);
                    const isCached = cachedModels.has(model.id);
                    const isDeleting = deletingId === model.id;

                    return (
                        <div
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${
                                isSelected ? 'scale-[1.01]' : 'hover:border-opacity-50'
                            }`}
                            style={{
                                background: isSelected 
                                    ? (isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(14, 165, 233, 0.05)') 
                                    : 'var(--bg-card)',
                                borderColor: isSelected ? 'var(--accent)' : 'var(--border-secondary)',
                            }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {model.name}
                                        </h4>
                                        {isSelected && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-500 font-bold">
                                                ACTIVE
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs mt-1 opacity-80" style={{ color: 'var(--text-secondary)' }}>
                                        {model.description}
                                    </p>
                                </div>

                                {/* Status / Actions */}
                                <div className="flex items-center gap-2">
                                    {isDeleting ? (
                                        <Loader2 size={16} className="animate-spin text-red-500" />
                                    ) : isCached ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono opacity-60 flex items-center gap-1">
                                                <HardDrive size={10} /> {model.size}
                                            </span>
                                            <button
                                                onClick={(e) => handleDelete(e, model.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-500 transition-colors"
                                                title="Delete from cache"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-60" style={{ color: 'var(--text-muted)' }}>
                                            <Download size={12} />
                                            Needs Download (~{model.size})
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selection Indicator (Radio-like) */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors ${
                                isSelected ? 'bg-sky-500' : 'bg-transparent'
                            }`} />
                        </div>
                    );
                })}
            </div>

            <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-secondary)' }}>
                <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p style={{ color: 'var(--text-secondary)' }}>
                        <strong>Note:</strong> Selecting a different model will require downloading it (approx 1-3GB). 
                        Downloads are cached locally effectively.
                    </p>
                </div>
            </div>
        </div>
    );
};
