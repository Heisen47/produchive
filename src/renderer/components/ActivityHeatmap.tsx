import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from './ThemeProvider';
import { Loader2, Calendar } from 'lucide-react';
import { Activity } from '../global';
import { useStore } from '../lib/store';

interface ActivityHeatmapProps {
    engine?: any;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = () => {
    const { isDark } = useTheme();
    const { ratings } = useStore();
    const [loading, setLoading] = useState(true);
    const [rangeData, setRangeData] = useState<Record<string, { activities: Activity[] }>>({});
    
    const currentYear = new Date().getFullYear();
    const periods = ['Last 365 Days', currentYear.toString(), (currentYear - 1).toString(), (currentYear - 2).toString()];
    const [selectedPeriod, setSelectedPeriod] = useState<string>('Last 365 Days');

    useEffect(() => {
        const fetchYearData = async () => {
            try {
                setLoading(true);
                let startDate, endDate;
                if (selectedPeriod === 'Last 365 Days') {
                    endDate = new Date().toISOString().split('T')[0];
                    const startD = new Date();
                    startD.setDate(startD.getDate() - 364);
                    startDate = startD.toISOString().split('T')[0];
                } else {
                    startDate = `${selectedPeriod}-01-01`;
                    endDate = selectedPeriod === currentYear.toString() 
                        ? new Date().toISOString().split('T')[0] 
                        : `${selectedPeriod}-12-31`;
                }

                const data = await window.electronAPI.getActivityDataRange(startDate, endDate);
                setRangeData(data);
            } catch (error) {
                console.error('Failed to fetch yearly activity data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchYearData();
    }, [selectedPeriod, currentYear]);

    const heatmapData = useMemo(() => {
        const dates: { date: Date; dateStr: string; duration: number; avgRating: number | null }[] = [];
        const monthLabels: { text: string; colIndex: number }[] = [];
        let maxDuration = 0;

        let startD, endD;
        if (selectedPeriod === 'Last 365 Days') {
            endD = new Date();
            startD = new Date();
            startD.setDate(startD.getDate() - 364);
            startD.setHours(0, 0, 0, 0); // ensure midnight basis
            endD.setHours(23, 59, 59, 999);
        } else {
            startD = new Date(`${selectedPeriod}-01-01T00:00:00`);
            endD = selectedPeriod === currentYear.toString() 
                ? new Date() 
                : new Date(`${selectedPeriod}-12-31T23:59:59`);
        }

        const weekStartOffset = startD.getDay();
        let currentMonth = -1;

        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            let duration = 0;
            if (rangeData[dateStr] && rangeData[dateStr].activities) {
                duration = rangeData[dateStr].activities.reduce((acc, act) => acc + (act.duration || 0), 0);
            }
            duration = duration / 60000; // convert to minutes
            
            if (duration > maxDuration) {
                maxDuration = duration;
            }

            // Calculate average rating for the day
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            
            const dayRatings = ratings.filter((r: any) => r.timestamp >= dayStart.getTime() && r.timestamp <= dayEnd.getTime());
            let avgRating = null;
            if (dayRatings.length > 0) {
                const total = dayRatings.reduce((acc: number, r: any) => acc + Number(r.rating || 0), 0);
                avgRating = Math.round((total / dayRatings.length) * 10) / 10;
            }

            dates.push({ date: new Date(d), dateStr, duration, avgRating });

            const itemIndex = weekStartOffset + (dates.length - 1);
            const colIndex = Math.floor(itemIndex / 7);

            if (d.getMonth() !== currentMonth) {
                const monthName = d.toLocaleString('en-US', { month: 'short' });
                // Only label if enough space from previous labels
                const lastLabel = monthLabels[monthLabels.length - 1];
                if (!lastLabel || (colIndex - lastLabel.colIndex >= 3)) {
                    monthLabels.push({ text: monthName, colIndex });
                }
                currentMonth = d.getMonth();
            }
        }

        return { dates, monthLabels, maxDuration };
    }, [rangeData, ratings, selectedPeriod, currentYear]);

    const getLevel = (duration: number): number => {
        if (duration === 0) return 0;
        if (duration < 30) return 1;
        if (duration < 60) return 2;
        if (duration < 120) return 3;
        if (duration < 240) return 4;
        return 5;
    };

    const getColor = (level: number): string => {
        const emptyColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        switch (level) {
            case 0: return emptyColor;
            case 1: return isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)'; // purple baseline
            case 2: return isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.4)';
            case 3: return isDark ? 'rgba(168, 85, 247, 0.7)' : 'rgba(168, 85, 247, 0.6)';
            case 4: return isDark ? 'rgba(168, 85, 247, 0.9)' : 'rgba(168, 85, 247, 0.8)';
            case 5: return isDark ? 'rgba(168, 85, 247, 1)' : 'rgba(168, 85, 247, 1)';
            default: return emptyColor;
        }
    };

    const formatMinutes = (mins: number): string => {
        if (mins === 0) return 'No activity';
        if (mins < 60) return `${Math.round(mins)}m logged`;
        const hrs = Math.floor(mins / 60);
        const rm = Math.round(mins % 60);
        return `${hrs}h ${rm > 0 ? rm + 'm ' : ''}logged`;
    };

    const weekStartOffset = heatmapData.dates[0]?.date.getDay() || 0;
    
    // Add empty cells for alignment if needed
    const gridCells = [
        ...Array.from({ length: weekStartOffset }).map((): null => null),
        ...heatmapData.dates
    ];

    // Auto-scroll to the end (right) on mount or period change if not explicitly viewed
    useEffect(() => {
        const scrollContainer = document.getElementById('heatmap-scroll-container');
        if (scrollContainer && selectedPeriod === 'Last 365 Days') {
            scrollContainer.scrollLeft = scrollContainer.scrollWidth;
        }
    }, [heatmapData]);

    return (
        <div 
            className="rounded-2xl p-6 relative overflow-visible mt-6 flex flex-col md:flex-row gap-8"
            style={{
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                border: '1px solid var(--border-card)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)'
            }}
        >
            <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div 
                            className="p-2 rounded-xl"
                            style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                        >
                            <Calendar size={20} />
                        </div>
                        <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            Focus Heatmap
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Less</span>
                    <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(level => (
                            <div 
                                key={level} 
                                className="w-3 h-3 rounded-sm"
                                style={{ background: getColor(level) }}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </div>

            {loading ? (
                <div className="h-[148px] flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                </div>
            ) : (
                <div className="flex w-full">
                    {/* Y-axis Labels for Days */}
                    <div className="flex-shrink-0 pt-[22px] pr-2">
                        <div className="grid gap-1.5 text-[10px] leading-[12px] text-right" style={{ gridTemplateRows: 'repeat(7, 12px)', color: 'var(--text-muted)' }}>
                            <div style={{ visibility: 'hidden' }}>Sun</div>
                            <div>Mon</div>
                            <div style={{ visibility: 'hidden' }}>Tue</div>
                            <div>Wed</div>
                            <div style={{ visibility: 'hidden' }}>Thu</div>
                            <div>Fri</div>
                            <div style={{ visibility: 'hidden' }}>Sat</div>
                        </div>
                    </div>

                    {/* Heatmap Grid */}
                    <div 
                        id="heatmap-scroll-container"
                        className="w-full overflow-x-auto overflow-y-visible custom-scrollbar pb-6"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        <div className="w-max relative pr-4">
                            {/* X-axis Labels for Months */}
                            <div className="relative mb-2 h-3.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {heatmapData.monthLabels.map((lbl, idx) => (
                                    <div key={idx} style={{ position: 'absolute', left: `${lbl.colIndex * 18}px`, top: 0 }}>
                                        {lbl.text}
                                    </div>
                                ))}
                            </div>

                            <div 
                                className="inline-grid gap-1.5"
                                style={{ 
                                    gridTemplateRows: 'repeat(7, 12px)',
                                    gridAutoFlow: 'column',
                                    gridAutoColumns: '12px'
                                }}
                            >
                                {gridCells.map((cell, idx) => {
                                    if (!cell) {
                                        return <div key={`empty-${idx}`} className="w-3 h-3" />;
                                    }

                                    const level = getLevel(cell.duration);
                                    
                                    return (
                                        <div 
                                            key={cell.dateStr}
                                            className="w-3 h-3 rounded-[3px] transition-all hover:scale-125 hover:z-20 relative group cursor-pointer"
                                            style={{ 
                                                background: getColor(level),
                                                border: level === 0 ? `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}` : 'none'
                                            }}
                                        >
                                            <div 
                                                className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none transition-opacity duration-200 flex flex-col items-center gap-1"
                                                style={{ 
                                                    background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-primary)',
                                                    backdropFilter: 'blur(8px)',
                                                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                                                }}
                                            >
                                                <div>
                                                    <span className="font-medium mr-1">{formatMinutes(cell.duration)}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>on {cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                                <div className="font-bold flex items-center gap-1" style={{ color: cell.avgRating ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                    {cell.avgRating !== null ? (
                                                        <span className="flex items-center gap-1">Rating: <span style={{ color: 'var(--accent)' }}>{cell.avgRating}/10</span></span>
                                                    ) : (
                                                        <span>Rating: NA</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Year Selector Sidebar */}
            <div className="md:w-32 flex-shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto custom-scrollbar md:pt-12">
                {periods.map(p => (
                    <button 
                        key={p} 
                        onClick={() => setSelectedPeriod(p)}
                        className="text-sm font-medium px-4 py-2 rounded-lg text-left transition-all whitespace-nowrap hover:opacity-80"
                        style={{
                            background: selectedPeriod === p ? 'var(--accent)' : 'transparent',
                            color: selectedPeriod === p ? '#fff' : 'var(--text-muted)'
                        }}
                    >
                        {p === 'Last 365 Days' ? 'Last Year' : p}
                    </button>
                ))}
            </div>
        </div>
    );
};
