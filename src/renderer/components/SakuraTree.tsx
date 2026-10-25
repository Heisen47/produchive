import React, { useEffect, useState } from 'react';
import './SakuraTree.css';

/**
 * Faint, wind-swayed cherry blossom tree rendered behind the app content.
 *
 * Performance: every moving piece is its own HTML layer animated with CSS
 * transform/opacity keyframes only, so the compositor moves cached bitmaps
 * and nothing is repainted per frame. Animations pause while the window is
 * hidden and are disabled entirely under prefers-reduced-motion.
 *
 * All layers share one 820x900 viewBox and the container keeps that aspect
 * ratio, so a branch's transform-origin in % equals its base in viewBox units.
 * Shapes are authored around a trunk near x=460 and shifted right by X_SHIFT,
 * leaving room for the long branch to reach left across the header band.
 */

const VB_W = 820;
const VB_H = 900;
const X_SHIFT = 300;

type Puff = [cx: number, cy: number, s: number];

// Offsets for one blossom cluster: a few overlapping discs in two shades.
const PUFF_SHAPE: Array<[dx: number, dy: number, r: number, light: boolean]> = [
    [0, 0, 1, false],
    [-0.9, 0.3, 0.75, true],
    [0.85, 0.35, 0.8, false],
    [0.2, -0.8, 0.7, true],
    [-0.4, 0.9, 0.6, true],
    [0.7, -0.5, 0.55, false],
];

const Blossoms: React.FC<{ puffs: Puff[] }> = ({ puffs }) => (
    <>
        {puffs.map(([cx, cy, s], i) =>
            PUFF_SHAPE.map(([dx, dy, r, light], j) => (
                <circle
                    key={`${i}-${j}`}
                    cx={cx + dx * s}
                    cy={cy + dy * s}
                    r={r * s}
                    fill={light ? 'var(--sakura-blossom-light)' : 'var(--sakura-blossom)'}
                />
            ))
        )}
    </>
);

interface BranchDef {
    /** Base of the branch (pivot for the sway), in viewBox units. */
    origin: [number, number];
    /** Wood strokes: [path, strokeWidth]. */
    wood: Array<[string, number]>;
    puffs: Puff[];
    /** Sway amplitude (deg), duration (s), delay (s). */
    sway: [number, number, number];
}

const BRANCHES: BranchDef[] = [
    {
        // Long branch reaching left across the header band.
        origin: [418, 300],
        wood: [
            ['M418 300 C 360 250, 280 210, 190 170 S 70 120, 20 118', 9],
            ['M300 222 C 280 190, 262 168, 236 150', 4],
            ['M210 180 C 180 196, 150 214, 118 218', 3.5],
            ['M120 140 C 100 120, 84 104, 60 96', 3],
            ['M20 118 C -60 112, -150 130, -240 110', 5],
            ['M-100 122 C -110 150, -118 175, -130 196', 2.5],
            ['M-170 124 C -190 104, -200 92, -214 80', 2.5],
        ],
        puffs: [
            [26, 116, 15], [62, 96, 13], [92, 128, 14], [118, 216, 13], [150, 206, 11],
            [168, 160, 15], [236, 148, 14], [214, 186, 11], [270, 204, 12], [330, 240, 11],
            [44, 140, 10], [200, 134, 10],
            [-240, 110, 14], [-200, 128, 12], [-150, 124, 13], [-110, 104, 11], [-60, 118, 12],
            [-214, 78, 11], [-130, 198, 11], [-114, 170, 9], [-20, 104, 10],
        ],
        sway: [1.6, 9, 0],
    },
    {
        // Upward branch toward the top-right corner.
        origin: [430, 290],
        wood: [
            ['M430 290 C 440 220, 462 150, 492 70', 7],
            ['M452 190 C 420 160, 402 132, 392 96', 3.5],
        ],
        puffs: [
            [494, 64, 15], [470, 100, 12], [392, 92, 14], [412, 130, 11], [500, 120, 10], [446, 150, 10],
        ],
        sway: [1.2, 11, -3],
    },
    {
        // Mid branch beside the stat cards.
        origin: [446, 520],
        wood: [
            ['M446 520 C 400 492, 340 464, 268 446', 5],
            ['M340 466 C 320 440, 300 424, 280 418', 2.5],
        ],
        puffs: [[266, 444, 13], [282, 414, 11], [318, 462, 10], [366, 478, 9]],
        sway: [2, 8, -5],
    },
    {
        // Small low branch along the right edge.
        origin: [458, 700],
        wood: [['M458 700 C 430 684, 396 674, 352 670', 4]],
        puffs: [[350, 668, 11], [376, 682, 9], [396, 662, 8]],
        sway: [2.4, 7, -2],
    },
];

const TRUNK =
    'M470 900 C 466 820, 474 740, 460 660 C 448 590, 452 520, 444 450 C 438 390, 430 340, 420 290';

// Falling petals: start position (% of container), sideways drift (px), duration and delay (s).
const PETALS: Array<{ x: number; y: number; drift: number; dur: number; delay: number; size: number }> = [
    { x: 8, y: 14, drift: -60, dur: 18, delay: 0, size: 9 },
    { x: 30, y: 20, drift: -90, dur: 22, delay: -6, size: 7 },
    { x: 46, y: 18, drift: -50, dur: 16, delay: -11, size: 8 },
    { x: 62, y: 26, drift: -110, dur: 24, delay: -3, size: 10 },
    { x: 78, y: 10, drift: -70, dur: 20, delay: -14, size: 8 },
    { x: 90, y: 14, drift: -40, dur: 17, delay: -8, size: 7 },
    { x: 56, y: 50, drift: -80, dur: 19, delay: -16, size: 8 },
    { x: 70, y: 56, drift: -60, dur: 21, delay: -1, size: 9 },
    { x: 84, y: 76, drift: -50, dur: 15, delay: -9, size: 7 },
    { x: 20, y: 24, drift: -70, dur: 23, delay: -19, size: 8 },
    { x: 38, y: 12, drift: -100, dur: 25, delay: -12, size: 9 },
    { x: 74, y: 40, drift: -90, dur: 18, delay: -5, size: 7 },
];

const Layer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="sakura-layer-svg">
        <g transform={`translate(${X_SHIFT} 0)`}>{children}</g>
    </svg>
);

export const SakuraTree: React.FC = () => {
    const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');

    useEffect(() => {
        const onVisibility = () => setHidden(document.visibilityState === 'hidden');
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    return (
        <div className={`sakura-tree${hidden ? ' sakura-paused' : ''}`} aria-hidden="true">
            <div className="sakura-layer">
                <Layer>
                    <path d={TRUNK} stroke="var(--sakura-wood)" strokeWidth={16} strokeLinecap="round" fill="none" />
                </Layer>
            </div>

            {BRANCHES.map((b, i) => (
                <div
                    key={i}
                    className="sakura-layer sakura-branch"
                    style={{
                        transformOrigin: `${((b.origin[0] + X_SHIFT) / VB_W) * 100}% ${(b.origin[1] / VB_H) * 100}%`,
                        ['--sway' as string]: `${b.sway[0]}deg`,
                        animationDuration: `${b.sway[1]}s`,
                        animationDelay: `${b.sway[2]}s`,
                    }}
                >
                    <Layer>
                        {b.wood.map(([d, w], j) => (
                            <path key={j} d={d} stroke="var(--sakura-wood)" strokeWidth={w} strokeLinecap="round" fill="none" />
                        ))}
                        <Blossoms puffs={b.puffs} />
                    </Layer>
                </div>
            ))}

            {PETALS.map((p, i) => (
                <span
                    key={i}
                    className="sakura-petal"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: p.size,
                        height: p.size * 0.7,
                        ['--drift' as string]: `${p.drift}px`,
                        animationDuration: `${p.dur}s`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};
