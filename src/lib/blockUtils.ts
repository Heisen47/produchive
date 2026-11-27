/**
 * Pure cross-platform helpers for OS-level app blocking & mode enforcement.
 * Shared between Electron main process (src/main.ts) and unit/integration tests.
 */

export const PROTECTED_BLOCK_APPS = new Set([
  "produchive",
  "electron",
  "finder",
  "explorer",
  "system settings",
  "system preferences",
  "windowserver",
  "loginwindow",
  "dock",
  "task manager",
  "taskmgr",
  "activity monitor",
  "spotlight",
  "control center",
]);

/**
 * Known macOS System Events process-name aliases for popular apps.
 * Keys are lowercased user-facing names.
 */
export const MAC_APP_ALIASES: Record<string, string[]> = {
  chrome: ["Google Chrome", "Chrome"],
  "google chrome": ["Google Chrome", "Chrome"],
  brave: ["Brave Browser", "Brave"],
  "brave browser": ["Brave Browser", "Brave"],
  edge: ["Microsoft Edge", "Edge"],
  "microsoft edge": ["Microsoft Edge", "Edge"],
  steam: ["Steam", "steam_osx"],
  steam_osx: ["steam_osx", "Steam"],
  teams: ["Microsoft Teams", "MSTeams", "Microsoft Teams (work or school)", "Microsoft Teams classic"],
  "microsoft teams": ["Microsoft Teams", "MSTeams", "Microsoft Teams (work or school)", "Microsoft Teams classic"],
  msteams: ["MSTeams", "Microsoft Teams"],
  "epic games launcher": ["Epic Games Launcher", "EpicGamesLauncher"],
  epicgameslauncher: ["EpicGamesLauncher", "Epic Games Launcher"],
  discord: ["Discord", "Discord PTB", "Discord Canary"],
  whatsapp: ["WhatsApp", "WhatsApp Web"],
  telegram: ["Telegram", "Telegram Desktop"],
  music: ["Music", "Apple Music"],
  tv: ["TV", "Apple TV"],
  "battle.net": ["Battle.net"],
  "riot client": ["Riot Client", "RiotClientUx"],
};

export function isProtectedBlockApp(name: string): boolean {
  const lower = (name || "").trim().toLowerCase();
  if (!lower) return true;
  return (
    PROTECTED_BLOCK_APPS.has(lower) ||
    PROTECTED_BLOCK_APPS.has(lower.replace(/\.(exe|app)$/i, ""))
  );
}

export function normalizeMacAppName(name: string): string {
  const trimmed = (name || "").trim();
  const lower = trimmed.toLowerCase();
  if (lower === "chrome") return "Google Chrome";
  if (lower === "brave") return "Brave Browser";
  if (lower === "edge") return "Microsoft Edge";
  return trimmed;
}

/**
 * Expands a single app name into all candidate macOS System Events process names
 * (deduplicated, excluding any protected system apps).
 */
export function getMacProcessCandidates(name: string): string[] {
  const trimmed = (name || "").trim();
  if (!trimmed || isProtectedBlockApp(trimmed)) return [];
  const lower = trimmed.toLowerCase();
  const raw = MAC_APP_ALIASES[lower] ? [...MAC_APP_ALIASES[lower], trimmed] : [normalizeMacAppName(trimmed), trimmed];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const clean = item.trim();
    if (!clean || isProtectedBlockApp(clean)) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

/**
 * Checks whether a running process name matches a blocked app entry (case-insensitive + alias-aware).
 */
export function doesProcessMatchBlockedName(runningProcessName: string, blockedAppName: string): boolean {
  if (!runningProcessName || !blockedAppName) return false;
  const runLower = runningProcessName.trim().toLowerCase();
  const blockedLower = blockedAppName.trim().toLowerCase();
  if (runLower === blockedLower) return true;

  const candidates = getMacProcessCandidates(blockedAppName);
  if (candidates.some((c) => c.toLowerCase() === runLower)) return true;

  const runCandidates = getMacProcessCandidates(runningProcessName);
  return runCandidates.some((c) => c.toLowerCase() === blockedLower);
}

export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, "");
}

/**
 * Builds a single fast batched AppleScript that hides or shows all running matching
 * processes in one osascript invocation, with per-process try/end try isolation so
 * one non-scriptable or non-running app never breaks the rest of the batch.
 */
export function buildMacBatchBlockScript(appNames: string[], block: boolean): string | null {
  const allCandidates: string[] = [];
  const seen = new Set<string>();

  for (const name of appNames) {
    for (const cand of getMacProcessCandidates(name)) {
      const key = cand.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      allCandidates.push(cand);
    }
  }

  if (allCandidates.length === 0) return null;

  const targetList = allCandidates
    .map((c) => `"${escapeAppleScriptString(c)}"`)
    .join(", ");

  const visibilityValue = block ? "false" : "true";

  return [
    `set targetNames to {${targetList}}`,
    `set affectedApps to {}`,
    `tell application "System Events"`,
    `  repeat with targetName in targetNames`,
    `    try`,
    `      if exists process (targetName as text) then`,
    `        set visible of process (targetName as text) to ${visibilityValue}`,
    `        set end of affectedApps to (targetName as text)`,
    `      end if`,
    `    end try`,
    `  end repeat`,
    `end tell`,
    `return affectedApps as text`,
  ].join("\n");
}
