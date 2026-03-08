import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, Download, X, Copy, Check, Sparkles } from 'lucide-react';

// X (formerly Twitter) logo component
const XLogo = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);
import { useTheme } from './ThemeProvider';

// Import the app logo (Vite resolves this to a URL)
import logoSrc from '../../../resources/icon.png';

interface ProductivityAnalysis {
    rating: number | string;
    verdict: 'productive' | 'neutral' | 'unproductive';
    explanation: string;
    tips: string[];
    categorization: {
        productive: string[];
        neutral: string[];
        distracting: string[];
    };
}

interface ShareCardProps {
    analysis: ProductivityAnalysis;
    goals: string[];
    dateLabel?: string;
}

// ═══════════════════════════════════════════
// Canvas-based share image generator
// ═══════════════════════════════════════════

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 1500;

const getVerdictGradient = (verdict: string): [string, string, string] => {
    switch (verdict) {
        case 'productive': return ['#059669', '#10b981', '#34d399'];
        case 'unproductive': return ['#dc2626', '#ef4444', '#f87171'];
        case 'neutral': return ['#d97706', '#f59e0b', '#fbbf24'];
        default: return ['#6366f1', '#8b5cf6', '#a78bfa'];
    }
};



// Draw verdict icon on canvas
function drawVerdictIcon(ctx: CanvasRenderingContext2D, x: number, y: number, verdict: string, size: number) {
    const r = size / 2;
    ctx.save();

    if (verdict === 'productive') {
        // Green circle with checkmark
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Checkmark
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.35, y);
        ctx.lineTo(x - r * 0.05, y + r * 0.3);
        ctx.lineTo(x + r * 0.4, y - r * 0.3);
        ctx.stroke();
    } else if (verdict === 'unproductive') {
        // Red circle with X
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();

        // X mark
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.3, y - r * 0.3);
        ctx.lineTo(x + r * 0.3, y + r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + r * 0.3, y - r * 0.3);
        ctx.lineTo(x - r * 0.3, y + r * 0.3);
        ctx.stroke();
    } else {
        // Yellow circle with dash
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dash
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - r * 0.35, y);
        ctx.lineTo(x + r * 0.35, y);
        ctx.stroke();
    }

    ctx.restore();
}

const getRatingColor = (rating: number): string => {
    if (rating >= 8) return '#10b981';
    if (rating >= 6) return '#34d399';
    if (rating >= 4) return '#fbbf24';
    return '#f87171';
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function renderShareImage(
    canvas: HTMLCanvasElement,
    analysis: ProductivityAnalysis,
    goals: string[],
    dateLabel?: string,
    logoImg?: HTMLImageElement | null
) {
    const ctx = canvas.getContext('2d')!;
    const dpr = 2;
    canvas.width = CARD_WIDTH * dpr;
    canvas.height = CARD_HEIGHT * dpr;
    canvas.style.width = `${CARD_WIDTH}px`;
    canvas.style.height = `${CARD_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const [darkColor, midColor, lightColor] = getVerdictGradient(analysis.verdict);
    const ratingNum = typeof analysis.rating === 'number' ? analysis.rating : 0;

    // ─── Background ───
    const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bgGrad.addColorStop(0, '#0a0e1a');
    bgGrad.addColorStop(0.5, '#0f1629');
    bgGrad.addColorStop(1, '#0a0e1a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    // ─── Decorative blobs ───
    ctx.save();
    ctx.globalAlpha = 0.12;
    const blobGrad1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 400);
    blobGrad1.addColorStop(0, midColor);
    blobGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad1;
    ctx.fillRect(0, 0, 600, 600);

    const blobGrad2 = ctx.createRadialGradient(CARD_WIDTH - 150, CARD_HEIGHT - 300, 0, CARD_WIDTH - 150, CARD_HEIGHT - 300, 500);
    blobGrad2.addColorStop(0, lightColor);
    blobGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad2;
    ctx.fillRect(CARD_WIDTH - 650, CARD_HEIGHT - 800, 650, 800);
    ctx.restore();

    // ─── Grid pattern overlay ───
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = 0; x < CARD_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CARD_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CARD_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CARD_WIDTH, y);
        ctx.stroke();
    }
    ctx.restore();

    let cursorY = 80;

    // ─── Brand header with logo ───
    const logoSize = 40;
    const logoPadding = 80;

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        // Draw rounded logo
        ctx.save();
        drawRoundedRect(ctx, logoPadding, cursorY - logoSize + 6, logoSize, logoSize, 10);
        ctx.clip();
        ctx.drawImage(logoImg, logoPadding, cursorY - logoSize + 6, logoSize, logoSize);
        ctx.restore();

        // Brand name next to logo
        ctx.font = '600 20px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('produchive', logoPadding + logoSize + 12, cursorY - logoSize / 2 + 6);
    } else {
        // Fallback: text-only brand
        ctx.font = '600 20px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('produchive', logoPadding, cursorY);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '400 16px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    const dateText = dateLabel || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(dateText, CARD_WIDTH - 80, cursorY);
    ctx.textAlign = 'left';

    cursorY += 60;

    // Score Circle
    const circleX = CARD_WIDTH / 2;
    const circleY = cursorY + 80;
    const circleR = 70;

    // Outer glow ring
    ctx.save();
    ctx.globalAlpha = 0.3;
    const glowGrad = ctx.createRadialGradient(circleX, circleY, circleR - 10, circleX, circleY, circleR + 30);
    glowGrad.addColorStop(0, midColor);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR + 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Score arc background
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
    ctx.stroke();

    // Score arc fill
    const scoreAngle = (ratingNum / 10) * Math.PI * 2;
    const arcGrad = ctx.createLinearGradient(circleX - circleR, circleY, circleX + circleR, circleY);
    arcGrad.addColorStop(0, darkColor);
    arcGrad.addColorStop(1, lightColor);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, -Math.PI / 2, -Math.PI / 2 + scoreAngle);
    ctx.stroke();

    // Score text
    ctx.font = 'bold 52px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeof analysis.rating === 'number' ? `${analysis.rating}` : `${analysis.rating}`, circleX, circleY - 4);
    ctx.font = '500 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('out of 10', circleX, circleY + 30);

    cursorY = circleY + circleR + 40;

    // Verdict label with icon
    const verdictText = `${analysis.verdict.charAt(0).toUpperCase() + analysis.verdict.slice(1)} Day`;
    ctx.font = 'bold 36px Inter, system-ui, sans-serif';
    const verdictTextWidth = ctx.measureText(verdictText).width;
    const iconSize = 36;
    const totalVerdictWidth = iconSize + 14 + verdictTextWidth; // icon + gap + text
    const verdictStartX = (CARD_WIDTH - totalVerdictWidth) / 2;

    // Draw the verdict icon
    drawVerdictIcon(ctx, verdictStartX + iconSize / 2, cursorY - 12, analysis.verdict, iconSize);

    // Draw the verdict text
    const verdictGrad = ctx.createLinearGradient(verdictStartX + iconSize + 14, cursorY, verdictStartX + totalVerdictWidth, cursorY);
    verdictGrad.addColorStop(0, midColor);
    verdictGrad.addColorStop(1, lightColor);
    ctx.fillStyle = verdictGrad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(verdictText, verdictStartX + iconSize + 14, cursorY);

    cursorY += 50;

    // ─── Explanation ───
    ctx.font = '400 20px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    const explanationLines = wrapText(ctx, `"${analysis.explanation}"`, CARD_WIDTH - 200);
    for (const line of explanationLines) {
        ctx.fillText(line, CARD_WIDTH / 2, cursorY);
        cursorY += 30;
    }

    cursorY += 30;

    // ─── Goals section ───
    if (goals.length > 0) {
        // Section card background
        const goalsCardH = 40 + goals.length * 36 + 20;
        drawRoundedRect(ctx, 80, cursorY, CARD_WIDTH - 160, goalsCardH, 20);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        cursorY += 35;
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#818cf8';
        ctx.textAlign = 'left';
        ctx.fillText('MY GOALS', 110, cursorY);
        cursorY += 28;

        ctx.font = '400 18px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (const goal of goals) {
            ctx.fillText(`•  ${goal}`, 120, cursorY);
            cursorY += 36;
        }

        cursorY += 30;
    }

    // ─── Categorization ───
    const categories = [
        { title: 'PRODUCTIVE', items: analysis.categorization.productive, color: '#4ade80', icon: '+' },
        { title: 'NEUTRAL', items: analysis.categorization.neutral, color: '#fbbf24', icon: '~' },
        { title: 'DISTRACTING', items: analysis.categorization.distracting, color: '#f87171', icon: '!' },
    ];

    const catWidth = (CARD_WIDTH - 160 - 32) / 3;
    const maxItems = Math.max(...categories.map(c => c.items.length), 1);
    const catCardH = 50 + maxItems * 30 + 30;

    for (let i = 0; i < 3; i++) {
        const cat = categories[i];
        const catX = 80 + i * (catWidth + 16);

        drawRoundedRect(ctx, catX, cursorY, catWidth, catCardH, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fill();
        ctx.strokeStyle = cat.color + '30';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Title
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = cat.color;
        ctx.textAlign = 'left';
        ctx.fillText(`${cat.icon}  ${cat.title}`, catX + 20, cursorY + 30);

        // Items
        ctx.font = '400 15px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        if (cat.items.length > 0) {
            cat.items.slice(0, 5).forEach((item, j) => {
                const itemText = item.length > 20 ? item.substring(0, 18) + '…' : item;
                ctx.fillText(`•  ${itemText}`, catX + 22, cursorY + 55 + j * 30);
            });
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = 'italic 14px Inter, system-ui, sans-serif';
            ctx.fillText('None detected', catX + 22, cursorY + 55);
        }
    }

    cursorY += catCardH + 30;

    // ─── Tips section ───
    if (analysis.tips.length > 0) {
        const tipsH = 40 + analysis.tips.length * 40 + 20;
        drawRoundedRect(ctx, 80, cursorY, CARD_WIDTH - 160, tipsH, 20);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        cursorY += 35;
        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.textAlign = 'left';
        ctx.fillText('TIPS & INSIGHTS', 110, cursorY);
        cursorY += 30;

        ctx.font = '400 17px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (const tip of analysis.tips.slice(0, 4)) {
            const tipLines = wrapText(ctx, tip, CARD_WIDTH - 260);
            ctx.fillText(`→  ${tipLines[0]}`, 120, cursorY);
            if (tipLines.length > 1) {
                cursorY += 24;
                ctx.fillText(`    ${tipLines[1]}`, 120, cursorY);
            }
            cursorY += 36;
        }
    }

    // ─── Footer watermark ───
    ctx.textAlign = 'center';
    ctx.font = '500 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillText('Generated by Produchive • Your self-hosted productivity companion', CARD_WIDTH / 2, CARD_HEIGHT - 50);

    // ─── Decorative dots pattern ───
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#ffffff';
    for (let x = 60; x < CARD_WIDTH; x += 30) {
        for (let y = 60; y < CARD_HEIGHT; y += 30) {
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Resize canvas to fit content
    const finalHeight = Math.min(cursorY + 100, CARD_HEIGHT);
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = CARD_WIDTH * dpr;
    outputCanvas.height = finalHeight * dpr;
    const outCtx = outputCanvas.getContext('2d')!;
    outCtx.drawImage(canvas, 0, 0, CARD_WIDTH * dpr, finalHeight * dpr, 0, 0, CARD_WIDTH * dpr, finalHeight * dpr);

    return outputCanvas;
}

// ═══════════════════════════════════════════
// Share Modal UI Component
// ═══════════════════════════════════════════

export const ShareCard: React.FC<ShareCardProps> = ({ analysis, goals, dateLabel }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isDark } = useTheme();

    const generateImage = useCallback(() => {
        if (!canvasRef.current) return;

        // Preload the logo, then render
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
            const outputCanvas = renderShareImage(canvasRef.current!, analysis, goals, dateLabel, logo);
            const url = outputCanvas.toDataURL('image/png', 1.0);
            setImageUrl(url);
        };
        logo.onerror = () => {
            // Render without logo if it fails to load
            const outputCanvas = renderShareImage(canvasRef.current!, analysis, goals, dateLabel, null);
            const url = outputCanvas.toDataURL('image/png', 1.0);
            setImageUrl(url);
        };
        logo.src = logoSrc;
    }, [analysis, goals, dateLabel]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(generateImage, 100);
        }
    }, [isOpen, generateImage]);

    const handleDownload = useCallback(() => {
        if (!imageUrl) return;
        setDownloading(true);
        const link = document.createElement('a');
        link.download = `produchive-report-${new Date().toISOString().split('T')[0]}.png`;
        link.href = imageUrl;
        link.click();
        setTimeout(() => setDownloading(false), 1000);
    }, [imageUrl]);

    const handleCopyImage = useCallback(async () => {
        if (!imageUrl) return;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy image:', err);
        }
    }, [imageUrl]);

    const handleShareX = useCallback(() => {
        const rating = typeof analysis.rating === 'number' ? analysis.rating : '?';
        const text = encodeURIComponent(
            `My productivity score today: ${rating}/10 — ${analysis.verdict.toUpperCase()} day!\n\nTracked with Produchive\n#productivity #produchive`
        );
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    }, [analysis]);

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 group"
                style={{
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))'
                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.06))',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: isDark ? '#c4b5fd' : '#7c3aed',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.1)',
                }}
            >
                <Share2 size={16} className="transition-transform duration-300 group-hover:-rotate-12" />
            </button>

            {/* Modal — portaled to document.body so it breaks out of any parent overflow/transform */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 99999 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
                >
                    <div
                        className="relative w-full max-w-2xl rounded-3xl overflow-hidden animate-scale-in"
                        style={{
                            background: isDark ? '#0f172a' : '#ffffff',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
                            maxHeight: '90vh',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4"
                            style={{ borderBottom: '1px solid var(--border-secondary)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                                    }}
                                >
                                    <Share2 size={18} color="#fff" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                        Share Your Progress
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        Download or share your productivity card
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                style={{
                                    background: 'var(--bg-elevated)',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Preview Area */}
                        <div
                            className="px-6 py-5 overflow-y-auto custom-scrollbar"
                            style={{ maxHeight: 'calc(90vh - 180px)' }}
                        >
                            {/* Hidden canvas for rendering */}
                            <canvas
                                ref={canvasRef}
                                style={{ display: 'none' }}
                                width={CARD_WIDTH * 2}
                                height={CARD_HEIGHT * 2}
                            />

                            {imageUrl ? (
                                <div className="relative group">
                                    <img
                                        src={imageUrl}
                                        alt="Produchive Share Card"
                                        className="w-full rounded-2xl shadow-2xl transition-transform duration-300"
                                        style={{
                                            border: '1px solid rgba(255,255,255,0.05)',
                                        }}
                                    />
                                    {/* Hover overlay */}
                                    <div
                                        className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: 'rgba(0,0,0,0.3)' }}
                                    >
                                        <span className="text-white text-sm font-medium px-4 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                                            Click the buttons below to share
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="flex items-center justify-center py-20 rounded-2xl"
                                    style={{ background: 'var(--bg-elevated)' }}
                                >
                                    <div className="text-center">
                                        <div className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#8b5cf6' }} />
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Generating your share card…</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div
                            className="px-6 py-4 flex items-center gap-3"
                            style={{ borderTop: '1px solid var(--border-secondary)' }}
                        >
                            <button
                                onClick={handleDownload}
                                disabled={!imageUrl}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff',
                                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                                }}
                            >
                                <Download size={16} />
                                {downloading ? 'Saved!' : 'Download Image'}
                            </button>

                            <button
                                onClick={handleCopyImage}
                                disabled={!imageUrl}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    border: '1px solid var(--border-primary)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>

                            <button
                                onClick={handleShareX}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                    color: isDark ? '#e2e8f0' : '#1a1a1a',
                                }}
                            >
                                <XLogo size={15} />
                                Post
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
