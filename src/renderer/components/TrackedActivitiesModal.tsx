import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, CheckCircle2, Minus, ShieldAlert, Layers } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { formatDomainOnly, sanitizeCategoryList } from '../lib/productivityAnalysisService';

export interface TrackedActivitiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    };
    initialCategory?: 'all' | 'productive' | 'neutral' | 'distracting';
}

type TabType = 'all' | 'productive' | 'neutral' | 'distracting';

interface ActivityEntry {
    name: string;
    category: 'productive' | 'neutral' | 'distracting';
}

export const TrackedActivitiesModal: React.FC<TrackedActivitiesModalProps> = ({
    isOpen,
    onClose,
    categorization,
    initialCategory = 'all',
}) => {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<TabType>(initialCategory);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialCategory);
            setSearchQuery('');
        }
    }, [isOpen, initialCategory]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const sanitizedCategories = useMemo(() => {
        return {
            productive: sanitizeCategoryList(categorization.productive || []),
            neutral: sanitizeCategoryList(categorization.neutral || []),
            distracting: sanitizeCategoryList(categorization.distracting || []),
        };
    }, [categorization]);

    const allEntries = useMemo<ActivityEntry[]>(() => {
        const entries: ActivityEntry[] = [];
        sanitizedCategories.productive.forEach((name) => entries.push({ name, category: 'productive' }));
        sanitizedCategories.neutral.forEach((name) => entries.push({ name, category: 'neutral' }));
        sanitizedCategories.distracting.forEach((name) => entries.push({ name, category: 'distracting' }));
        return entries;
    }, [sanitizedCategories]);

    const filteredEntries = useMemo(() => {
        let list: ActivityEntry[] = [];
        if (activeTab === 'all') {
            list = allEntries;
        } else if (activeTab === 'productive') {
            list = sanitizedCategories.productive.map((name) => ({ name, category: 'productive' as const }));
        } else if (activeTab === 'neutral') {
            list = sanitizedCategories.neutral.map((name) => ({ name, category: 'neutral' as const }));
        } else {
            list = sanitizedCategories.distracting.map((name) => ({ name, category: 'distracting' as const }));
        }

        const query = searchQuery.trim().toLowerCase();
        if (!query) return list;
        return list.filter((item) => item.name.toLowerCase().includes(query));
    }, [activeTab, allEntries, sanitizedCategories, searchQuery]);

    if (!isOpen) return null;

    const counts = {
        all: allEntries.length,
        productive: sanitizedCategories.productive.length,
        neutral: sanitizedCategories.neutral.length,
        distracting: sanitizedCategories.distracting.length,
    };

    const getCategoryDetails = (cat: 'productive' | 'neutral' | 'distracting') => {
        switch (cat) {
            case 'productive':
                return {
                    icon: CheckCircle2,
                    color: '#4ade80',
                    bg: 'rgba(34, 197, 94, 0.12)',
                    border: 'rgba(34, 197, 94, 0.25)',
                    label: 'Productive',
                };
            case 'distracting':
                return {
                    icon: ShieldAlert,
                    color: '#f87171',
                    bg: 'rgba(239, 68, 68, 0.12)',
                    border: 'rgba(239, 68, 68, 0.25)',
                    label: 'Distracting',
                };
            default:
                return {
                    icon: Minus,
                    color: '#fbbf24',
                    bg: 'rgba(245, 158, 11, 0.12)',
                    border: 'rgba(245, 158, 11, 0.25)',
                    label: 'Neutral',
                };
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl rounded-2xl p-6 shadow-2xl border flex flex-col max-h-[85vh] transition-all animate-scale-up"
                style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                            <Layers size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                                All Tracked Activities & Tabs
                            </h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {counts.all} total unique window & browser tab activities detected today
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs & Search Header */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                    {/* Category Tabs */}
                    <div
                        className="flex items-center p-1 rounded-xl border shrink-0 text-xs font-medium"
                        style={{
                            background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        }}
                    >
                        {[
                            { key: 'all' as TabType, label: 'All', count: counts.all },
                            { key: 'productive' as TabType, label: 'Productive', count: counts.productive, color: '#4ade80' },
                            { key: 'neutral' as TabType, label: 'Neutral', count: counts.neutral, color: '#fbbf24' },
                            { key: 'distracting' as TabType, label: 'Distracting', count: counts.distracting, color: '#f87171' },
                        ].map((tab) => {
                            const isSelected = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className="px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                                    style={{
                                        background: isSelected
                                            ? isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)'
                                            : 'transparent',
                                        color: isSelected
                                            ? tab.color || 'var(--text-primary)'
                                            : 'var(--text-muted)',
                                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                                        fontWeight: isSelected ? 600 : 500,
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold"
                                        style={{
                                            background: isSelected
                                                ? (tab.color ? `${tab.color}25` : 'rgba(255,255,255,0.15)')
                                                : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                                            color: tab.color || 'inherit',
                                        }}
                                    >
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search bar */}
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs flex-1 max-w-xs"
                        style={{
                            background: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                        }}
                    >
                        <Search size={14} className="opacity-50 shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter activities..."
                            className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="opacity-50 hover:opacity-100 p-0.5 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Activities Scrollable List */}
                <div className="flex-1 min-h-[220px] max-h-[52vh] overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
                    {filteredEntries.length > 0 ? (
                        filteredEntries.map((entry, idx) => {
                            const details = getCategoryDetails(entry.category);
                            const IconComponent = details.icon;

                            return (
                                <div
                                    key={idx}
                                    className="p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors group"
                                    style={{
                                        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
                                    }}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div
                                            className="p-1 rounded-md shrink-0"
                                            style={{
                                                background: details.bg,
                                                color: details.color,
                                            }}
                                        >
                                            <IconComponent size={13} />
                                        </div>
                                        <span
                                            title={entry.name}
                                            className="font-medium truncate flex-1"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {formatDomainOnly(entry.name)}
                                        </span>
                                    </div>

                                    <span
                                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 border"
                                        style={{
                                            background: details.bg,
                                            color: details.color,
                                            borderColor: details.border,
                                        }}
                                    >
                                        {details.label}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                                {searchQuery
                                    ? `No activities match "${searchQuery}"`
                                    : 'No activities tracked in this category.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Showing {filteredEntries.length} of {allEntries.length} activities
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
