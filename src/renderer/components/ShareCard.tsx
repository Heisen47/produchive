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
import { openUrl } from '../lib/urls';
import {
    formatDomainOnly,
    sanitizeCategoryList,
    resolveModelDisplayName,
} from '../lib/productivityAnalysisService';

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
    modelName?: string;
}

interface ShareCardProps {
    analysis: ProductivityAnalysis;
    goals: string[];
    dateLabel?: string;
    modelName?: string;
}

// ═══════════════════════════════════════════
// Canvas-based share image generator
// ═══════════════════════════════════════════

const CARD_WIDTH = 1200;

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
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
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

function calculateCardHeight(
    ctx: CanvasRenderingContext2D,
    analysis: ProductivityAnalysis,
    goals: string[]
): number {
    let y = 70; // Top padding
    y += 50; // Header brand & date
    y += 40; // Spacing to score

    const circleR = 72;
    y += circleR * 2; // Score circle height
    y += 36; // Spacing to verdict

    y += 40; // Verdict label and icon
    y += 24; // Spacing to model badge

    y += 32; // Model badge height
    y += 26; // Spacing to explanation

    ctx.font = '400 19px Inter, system-ui, sans-serif';
    const explanationLines = wrapText(ctx, `"${formatDomainOnly(analysis.explanation)}"`, CARD_WIDTH - 240);
    y += explanationLines.length * 28 + 30;

    if (goals.length > 0) {
        const goalsToShow = goals.slice(0, 5);
        const goalsCardH = 45 + goalsToShow.length * 34 + 18;
        y += goalsCardH + 25;
    }

    const categories = [
        sanitizeCategoryList(analysis.categorization.productive),
        sanitizeCategoryList(analysis.categorization.neutral),
        sanitizeCategoryList(analysis.categorization.distracting),
    ];
    const maxItems = Math.min(5, Math.max(...categories.map(c => c.length), 1));
    const catCardH = 50 + maxItems * 30 + 25;
    y += catCardH + 30;

    if (analysis.tips && analysis.tips.length > 0) {
        const tipsToShow = analysis.tips.slice(0, 3);
        const tipsH = 45 + tipsToShow.length * 44 + 18;
        y += tipsH + 25;
    }

    // Divider line + spacing + footer bar + bottom padding
    y += 10 + 20 + 68 + 45;

    return Math.max(y, 1150);
}

function renderShareImage(
    canvas: HTMLCanvasElement,
    analysis: ProductivityAnalysis,
    goals: string[],
    dateLabel?: string,
    logoImg?: HTMLImageElement | null,
    modelName?: string
): HTMLCanvasElement {
    const ctx = canvas.getContext('2d')!;
    const dpr = 2;
    const resolvedModelName = analysis.modelName || modelName || resolveModelDisplayName();
    const cardHeight = calculateCardHeight(ctx, analysis, goals);

    canvas.width = CARD_WIDTH * dpr;
    canvas.height = cardHeight * dpr;
    canvas.style.width = `${CARD_WIDTH}px`;
    canvas.style.height = `${cardHeight}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    const [darkColor, midColor, lightColor] = getVerdictGradient(analysis.verdict);
    const ratingNum = typeof analysis.rating === 'number' ? analysis.rating : 0;

    // ─── Background Gradient ───
    const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, cardHeight);
    bgGrad.addColorStop(0, '#090d19');
    bgGrad.addColorStop(0.4, '#0d1527');
    bgGrad.addColorStop(1, '#090d19');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CARD_WIDTH, cardHeight);

    // ─── Ambient Glow Blobs ───
    ctx.save();
    ctx.globalAlpha = 0.12;
    const blobGrad1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 450);
    blobGrad1.addColorStop(0, midColor);
    blobGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad1;
    ctx.fillRect(0, 0, 700, 700);

    const blobGrad2 = ctx.createRadialGradient(CARD_WIDTH - 150, cardHeight - 250, 0, CARD_WIDTH - 150, cardHeight - 250, 480);
    blobGrad2.addColorStop(0, lightColor);
    blobGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = blobGrad2;
    ctx.fillRect(CARD_WIDTH - 700, cardHeight - 800, 700, 800);
    ctx.restore();

    // ─── Geometric Grid Overlay ───
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = 0; x < CARD_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cardHeight);
        ctx.stroke();
    }
    for (let y = 0; y < cardHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CARD_WIDTH, y);
        ctx.stroke();
    }
    ctx.restore();

    // ─── Card Border Framing ───
    ctx.save();
    drawRoundedRect(ctx, 2, 2, CARD_WIDTH - 4, cardHeight - 4, 24);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    let cursorY = 70;

    // ─── Brand Header ───
    const logoSize = 44;
    const logoPadding = 80;

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.save();
        drawRoundedRect(ctx, logoPadding, cursorY - 6, logoSize, logoSize, 12);
        ctx.clip();
        ctx.drawImage(logoImg, logoPadding, cursorY - 6, logoSize, logoSize);
        ctx.restore();

        drawRoundedRect(ctx, logoPadding, cursorY - 6, logoSize, logoSize, 12);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 22px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const brandText = 'produchive';
        const brandX = logoPadding + logoSize + 14;
        const brandY = cursorY + logoSize / 2 - 6;
        ctx.fillText(brandText, brandX, brandY);

        // App Website Pill Badge
        const brandWidth = ctx.measureText(brandText).width;
        const pillX = brandX + brandWidth + 12;
        const pillY = brandY - 12;
        const pillW = 124;
        const pillH = 24;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#a5b4fc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('produchive.com', pillX + pillW / 2, pillY + pillH / 2);
    } else {
        drawRoundedRect(ctx, logoPadding, cursorY - 6, logoSize, logoSize, 12);
        const iconGrad = ctx.createLinearGradient(logoPadding, cursorY - 6, logoPadding + logoSize, cursorY - 6 + logoSize);
        iconGrad.addColorStop(0, '#6366f1');
        iconGrad.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = iconGrad;
        ctx.fill();

        ctx.font = 'bold 22px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', logoPadding + logoSize / 2, cursorY + logoSize / 2 - 6);

        ctx.textAlign = 'left';
        const brandText = 'produchive';
        const brandX = logoPadding + logoSize + 14;
        const brandY = cursorY + logoSize / 2 - 6;
        ctx.fillText(brandText, brandX, brandY);

        const brandWidth = ctx.measureText(brandText).width;
        const pillX = brandX + brandWidth + 12;
        const pillY = brandY - 12;
        const pillW = 124;
        const pillH = 24;
        drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 6);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '600 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#a5b4fc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('produchive.com', pillX + pillW / 2, pillY + pillH / 2);
    }

    // Top Right: Date & Privacy status
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '400 15px Inter, system-ui, sans-serif';
    const dateText = dateLabel || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(dateText, CARD_WIDTH - 80, cursorY + 6);

    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('LOCAL ON-DEVICE AI', CARD_WIDTH - 80, cursorY + 28);
    const badgeTextW = ctx.measureText('LOCAL ON-DEVICE AI').width;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(CARD_WIDTH - 80 - badgeTextW - 8, cursorY + 27, 3, 0, Math.PI * 2);
    ctx.fill();

    cursorY += 90;

    // ─── Score Meter ───
    const circleX = CARD_WIDTH / 2;
    const circleR = 72;
    const circleY = cursorY + circleR;

    ctx.save();
    ctx.globalAlpha = 0.35;
    const glowGrad = ctx.createRadialGradient(circleX, circleY, circleR - 10, circleX, circleY, circleR + 35);
    glowGrad.addColorStop(0, midColor);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR + 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, -Math.PI / 2, Math.PI * 2 - Math.PI / 2);
    ctx.stroke();

    const scoreAngle = (Math.max(0, Math.min(10, ratingNum)) / 10) * Math.PI * 2;
    const arcGrad = ctx.createLinearGradient(circleX - circleR, circleY, circleX + circleR, circleY);
    arcGrad.addColorStop(0, darkColor);
    arcGrad.addColorStop(1, lightColor);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, -Math.PI / 2, -Math.PI / 2 + scoreAngle);
    ctx.stroke();

    ctx.font = 'bold 54px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typeof analysis.rating === 'number' ? `${analysis.rating}` : `${analysis.rating}`, circleX, circleY - 4);
    ctx.font = '500 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('out of 10', circleX, circleY + 30);

    cursorY = circleY + circleR + 36;

    // ─── Verdict with Icon ───
    const verdictText = `${analysis.verdict.charAt(0).toUpperCase() + analysis.verdict.slice(1)} Day`;
    ctx.font = 'bold 34px Inter, system-ui, sans-serif';
    const verdictTextWidth = ctx.measureText(verdictText).width;
    const iconSize = 34;
    const totalVerdictWidth = iconSize + 12 + verdictTextWidth;
    const verdictStartX = (CARD_WIDTH - totalVerdictWidth) / 2;

    drawVerdictIcon(ctx, verdictStartX + iconSize / 2, cursorY - 10, analysis.verdict, iconSize);

    const verdictGrad = ctx.createLinearGradient(verdictStartX + iconSize + 12, cursorY, verdictStartX + totalVerdictWidth, cursorY);
    verdictGrad.addColorStop(0, midColor);
    verdictGrad.addColorStop(1, lightColor);
    ctx.fillStyle = verdictGrad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(verdictText, verdictStartX + iconSize + 12, cursorY);

    cursorY += 24;

    // ─── AI Model Judge Pill Badge ───
    const modelPrefix = 'EVALUATED BY';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const prefixW = ctx.measureText(modelPrefix).width;
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    const modelW = ctx.measureText(resolvedModelName).width;
    const dotW = 8;
    const sepW = 12;
    const badgePadX = 18;
    const badgeW = badgePadX * 2 + dotW + 8 + prefixW + sepW + modelW;
    const badgeH = 32;
    const badgeX = (CARD_WIDTH - badgeW) / 2;
    const badgeY = cursorY;

    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const dotX = badgeX + badgePadX + 4;
    const dotY = badgeY + badgeH / 2;
    ctx.fillStyle = '#818cf8';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#818cf8';
    const textStartX = dotX + 8;
    ctx.fillText(modelPrefix, textStartX, dotY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText('•', textStartX + prefixW + 5, dotY);

    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(resolvedModelName, textStartX + prefixW + sepW + 4, dotY);

    cursorY += badgeH + 26;

    // ─── Explanation ───
    ctx.font = '400 19px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.74)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const explanationLines = wrapText(ctx, `"${formatDomainOnly(analysis.explanation)}"`, CARD_WIDTH - 240);
    for (const line of explanationLines) {
        ctx.fillText(line, CARD_WIDTH / 2, cursorY);
        cursorY += 28;
    }
    cursorY += 30;

    // ─── Goals Section ───
    if (goals.length > 0) {
        const goalsToShow = goals.slice(0, 5);
        const goalsCardH = 45 + goalsToShow.length * 34 + 18;
        drawRoundedRect(ctx, 80, cursorY, CARD_WIDTH - 160, goalsCardH, 18);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        cursorY += 32;
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#818cf8';
        ctx.textAlign = 'left';
        ctx.fillText('MY GOALS & FOCUS TARGETS', 110, cursorY);
        cursorY += 26;

        ctx.font = '400 17px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        for (const goal of goalsToShow) {
            const goalText = goal.length > 80 ? goal.substring(0, 77) + '…' : goal;
            ctx.fillText(`•  ${goalText}`, 115, cursorY);
            cursorY += 34;
        }

        cursorY += 25;
    }

    // ─── Categorization Grid (3 Columns) ───
    const categories = [
        { title: 'PRODUCTIVE', items: sanitizeCategoryList(analysis.categorization.productive), color: '#4ade80', icon: '+' },
        { title: 'NEUTRAL', items: sanitizeCategoryList(analysis.categorization.neutral), color: '#fbbf24', icon: '~' },
        { title: 'DISTRACTING', items: sanitizeCategoryList(analysis.categorization.distracting), color: '#f87171', icon: '!' },
    ];

    const catWidth = (CARD_WIDTH - 160 - 32) / 3;
    const maxItems = Math.min(5, Math.max(...categories.map(c => c.items.length), 1));
    const catCardH = 50 + maxItems * 30 + 25;

    for (let i = 0; i < 3; i++) {
        const cat = categories[i];
        const catX = 80 + i * (catWidth + 16);

        drawRoundedRect(ctx, catX, cursorY, catWidth, catCardH, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.fill();
        ctx.strokeStyle = cat.color + '25';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = cat.color;
        ctx.textAlign = 'left';
        ctx.fillText(`${cat.icon}  ${cat.title}`, catX + 18, cursorY + 28);

        ctx.font = '400 15px Inter, system-ui, sans-serif';
        if (cat.items.length > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.68)';
            cat.items.slice(0, 5).forEach((item, j) => {
                const itemText = item.length > 22 ? item.substring(0, 20) + '…' : item;
                ctx.fillText(`•  ${itemText}`, catX + 18, cursorY + 54 + j * 30);
            });
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = 'italic 14px Inter, system-ui, sans-serif';
            ctx.fillText('None detected', catX + 18, cursorY + 54);
        }
    }

    cursorY += catCardH + 30;

    // ─── Tips / Insights Section ───
    if (analysis.tips && analysis.tips.length > 0) {
        const tipsToShow = analysis.tips.slice(0, 3);
        const tipsH = 45 + tipsToShow.length * 44 + 18;
        drawRoundedRect(ctx, 80, cursorY, CARD_WIDTH - 160, tipsH, 18);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        cursorY += 32;
        ctx.font = 'bold 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#93c5fd';
        ctx.textAlign = 'left';
        ctx.fillText('ACTIONABLE INSIGHTS', 110, cursorY);
        cursorY += 26;

        ctx.font = '400 16px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        for (const rawTip of tipsToShow) {
            const tip = formatDomainOnly(rawTip);
            const tipLines = wrapText(ctx, tip, CARD_WIDTH - 250);
            ctx.fillText(`→  ${tipLines[0]}`, 115, cursorY);
            if (tipLines.length > 1) {
                cursorY += 22;
                ctx.fillText(`    ${tipLines[1]}`, 115, cursorY);
            }
            cursorY += 34;
        }
        cursorY += 25;
    }

    // ─── Sleek Footer Banner (Website & Telemetry) ───
    cursorY += 10;

    const divGrad = ctx.createLinearGradient(80, cursorY, CARD_WIDTH - 80, cursorY);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.2, 'rgba(139, 92, 246, 0.35)');
    divGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.45)');
    divGrad.addColorStop(0.8, 'rgba(139, 92, 246, 0.35)');
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, cursorY);
    ctx.lineTo(CARD_WIDTH - 80, cursorY);
    ctx.stroke();

    cursorY += 20;

    const footerH = 68;
    drawRoundedRect(ctx, 80, cursorY, CARD_WIDTH - 160, footerH, 16);
    const footerGrad = ctx.createLinearGradient(80, cursorY, CARD_WIDTH - 80, cursorY);
    footerGrad.addColorStop(0, 'rgba(99, 102, 241, 0.10)');
    footerGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.06)');
    footerGrad.addColorStop(1, 'rgba(99, 102, 241, 0.10)');
    ctx.fillStyle = footerGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const footerMidY = cursorY + footerH / 2;
    let textLeftX = 105;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const miniLogoSize = 28;
        ctx.save();
        drawRoundedRect(ctx, 105, footerMidY - miniLogoSize / 2, miniLogoSize, miniLogoSize, 7);
        ctx.clip();
        ctx.drawImage(logoImg, 105, footerMidY - miniLogoSize / 2, miniLogoSize, miniLogoSize);
        ctx.restore();
        textLeftX = 105 + miniLogoSize + 12;
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 17px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('produchive.com', textLeftX, footerMidY - 2);

    ctx.font = '400 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('Private, On-Device AI Productivity Telemetry', textLeftX, footerMidY + 16);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('100% Private • Local Telemetry', CARD_WIDTH - 105, footerMidY);

    const rightTextW = ctx.measureText('100% Private • Local Telemetry').width;
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(CARD_WIDTH - 105 - rightTextW - 8, footerMidY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return canvas;
}

// ═══════════════════════════════════════════
// Share Modal UI Component
// ═══════════════════════════════════════════

export const ShareCard: React.FC<ShareCardProps> = ({ analysis, goals, dateLabel, modelName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isDark } = useTheme();

    const resolvedModelName = analysis.modelName || modelName || resolveModelDisplayName();

    const generateImage = useCallback(() => {
        if (!canvasRef.current) return;

        // Preload the logo, then render
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
            const outputCanvas = renderShareImage(canvasRef.current!, analysis, goals, dateLabel, logo, resolvedModelName);
            const url = outputCanvas.toDataURL('image/png', 1.0);
            setImageUrl(url);
        };
        logo.onerror = () => {
            // Render without logo if it fails to load
            const outputCanvas = renderShareImage(canvasRef.current!, analysis, goals, dateLabel, null, resolvedModelName);
            const url = outputCanvas.toDataURL('image/png', 1.0);
            setImageUrl(url);
        };
        logo.src = logoSrc;
    }, [analysis, goals, dateLabel, resolvedModelName]);

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
        const modelLine = resolvedModelName ? `\nAI Judge: ${resolvedModelName}` : '';
        const text = encodeURIComponent(
            `My productivity score today: ${rating}/10 — ${analysis.verdict.toUpperCase()} day!${modelLine}\n\nTracked with @produchive\nhttps://produchive.com\n#productivity #produchive`
        );
        openUrl(`https://twitter.com/intent/tweet?text=${text}`);
    }, [analysis, resolvedModelName]);

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
                                height={2400}
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
