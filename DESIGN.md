# Design System: Produchive
**Scope:** Produchive Desktop App (Electron + React + Tailwind)

## 1. Visual Theme & Atmosphere
Produchive is a **calm, nocturnal-glass productivity sanctuary** inspired by quiet late-night study rooms and subtle Studio Ghibli / drifting sakura motifs. The atmosphere is **airy, restrained, and unhurried** — never loud, neon, or cluttered.

- **Dark Mode (Default — Midnight Sakura Glass):** Deep obsidian-navy canvas with softly drifting sakura petals visible behind frosted translucent glass cards. Surfaces whisper through hairline translucent borders rather than heavy opaque boxes.
- **Light Mode (Warm Cream Parchment):** Soft warm beige paper canvas with crisp milky-white translucent cards and warm stone borders.
- **Restraint Principle:** Let the primary Cobalt Blue accent carry focus and navigation. Avoid multi-color rainbow button walls or saturated full-width solid fills; use **translucent tinted pills** (10–15% tint with a 25–30% matching border) for interactive actions.

## 2. Color Palette & Roles

### Dark Theme (Default)
- **Midnight Canvas** (`#0a0e1a`): Primary window background (`--bg-primary`).
- **Deep Ink Surface** (`#0f1629`): Secondary structural chrome (`--bg-secondary`).
- **Frosted Slate Glass** (`rgba(15, 23, 42, 0.70)`): Primary glass card container (`--bg-card`) with `20px` backdrop blur so background sakura artwork breathes softly through.
- **Elevated Mist** (`rgba(30, 41, 59, 0.50)`): Nested interactive rows, segmented controls, and subtle pills (`--bg-elevated`).
- **Hairline Cobalt Border** (`rgba(59, 130, 246, 0.12)`): Default card stroke (`--border-card`); brightens gently to `rgba(59, 130, 246, 0.30)` on hover (`--border-hover`).
- **Cloud White** (`#f1f5f9`): Primary headings and high-emphasis values (`--text-primary`).
- **Cool Slate** (`#94a3b8`): Body descriptions and secondary labels (`--text-secondary`).
- **Muted Pewter** (`#64748b`): Metadata, timestamps, and section kickers (`--text-muted`).

### Light Theme (Warm Parchment)
- **Warm Linen Canvas** (`#f5f0e8`): Primary light-mode background (`--bg-primary`).
- **Frosted Ivory Glass** (`rgba(255, 255, 255, 0.80)`): Primary card surface (`--bg-card`).
- **Soft Paper Elevation** (`rgba(255, 255, 255, 0.60)`): Nested interactive controls (`--bg-elevated`).
- **Espresso Ink** (`#1a1612`): Primary headings (`--text-primary`).
- **Warm Stone** (`#57534e`): Secondary text (`--text-secondary`).

### Unified Semantic Accents (Shared Across Modes)
- **Primary Cobalt Accent** (`#3b82f6`, hover `#60a5fa`, deep `#2563eb`): Single primary accent for active tabs, focus indicators, and primary links (`--accent`).
- **Soft Emerald** (`#4ade80` text on `rgba(34, 197, 94, 0.10)` fill, `rgba(34, 197, 94, 0.25)` border): Active/running/healthy/unlocked states (e.g., Active Mode, Relax Mode, Start Monitoring).
- **Soft Coral** (`#f87171` text on `rgba(239, 68, 68, 0.10)` fill, `rgba(239, 68, 68, 0.25)` border): Destructive actions, Stop states, and blocked-app indicators.
- **Gentle Indigo Tint** (`#a5b4fc` text on `rgba(99, 102, 241, 0.12)` fill, `rgba(99, 102, 241, 0.28)` border): AI / Focus highlight accents.

## 3. Typography Rules
- **Display Font:** `Outfit` (`font-display`) for page titles, section headers, and hero metrics — semibold to bold (`600–700`), tight tracking (`-0.01em`).
- **Body & UI Font:** `Inter` (`font-sans`) for controls, list rows, descriptions, and labels — regular (`400`) to semibold (`600`).
- **Numeric & Status Readouts:** Monospace (`font-mono`) for durations, countdown timers, and timestamps to prevent jitter during live ticks.
- **Section Kickers:** `11px` uppercase bold with wide tracking (`tracking-wider`) in Muted Pewter (`--text-muted`).

## 4. Component Stylings
- **Buttons:**
  - *Primary Action:* Subtle Cobalt gradient (`#3b82f6` → `#2563eb`) or translucent Cobalt/Indigo glass pill (`12–15%` fill + `25–30%` border) with generously rounded corners (`12px`, `rounded-xl`). Never harsh rainbow solid blocks across sibling cards.
  - *Secondary / Ghost:* Elevated Mist (`--bg-elevated`) with hairline border (`--border-secondary`), gently lifting border contrast on hover.
  - *Status Toggle (Active / Relax / Stop):* Translucent semantic tint (`10–14%` emerald or coral) with matching soft border and small status dot.
- **Cards & Containers:**
  - Generously rounded corners (`16px`, `rounded-2xl`) using `.glass-card-static` (static structural panes) or `.glass-card` (interactive summary tiles).
  - Soft ambient depth (`0 8px 32px rgba(0, 0, 0, 0.3)` in dark; `0 4px 16px rgba(0, 0, 0, 0.06)` in light) with `20px` backdrop blur.
  - Prefer **master–detail split panes** and **clean compact list rows** over repetitive walls of heavy cards.
- **Inputs & Pills:**
  - Translucent dark/light input surface (`--bg-input`) with subtle stroke (`--border-input`) and rounded `12px` corners.
  - Chips and tags stay low-contrast (`--bg-elevated` with hairline border) so content hierarchy remains calm and scannable.

## 5. Layout Principles
- **Above-the-Fold Clarity:** Keep primary controls and the main workspace visible immediately without forcing vertical scrolling past oversized banners.
- **Generous Whitespace & Breathing Room:** Use `24px` (`gap-6` / `p-6`) between major glass panels and `8–12px` between compact list rows.
- **Visual Hierarchy:** One primary focal action per view; let calm typography, alignment, and subtle opacity shifts do the work instead of competing colored badges.
