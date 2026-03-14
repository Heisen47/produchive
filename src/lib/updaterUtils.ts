/**
 * Pure utility functions for the auto-updater.
 * Separated from autoUpdater.ts to allow testing without Electron dependencies.
 */

/** Compare two semver strings. Returns 1 if a > b, -1 if a < b, 0 if equal. */
export function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Get the expected asset suffix for this platform + arch */
export function getPlatformAssetPattern(
  platform: string = process.platform,
  arch: string = process.arch,
): { suffix: string; ext: string } {
  if (platform === "darwin") {
    const archLabel = arch === "arm64" ? "arm64" : "x64";
    return { suffix: `darwin-${archLabel}`, ext: ".zip" };
  }
  if (platform === "win32") {
    return { suffix: "win32-x64", ext: ".zip" };
  }
  if (platform === "linux") {
    if (arch === "x64") {
      return { suffix: "amd64", ext: ".deb" };
    }
    return { suffix: "linux", ext: ".rpm" };
  }
  return { suffix: platform, ext: ".zip" };
}

/** Find the best matching download asset from a GitHub release */
export function findAssetForPlatform(
  assets: Array<{ name: string; browser_download_url: string; size: number }>,
  platform: string = process.platform,
  arch: string = process.arch,
): { name: string; url: string; size: number } | null {
  const { suffix, ext } = getPlatformAssetPattern(platform, arch);

  // First try exact platform + extension match
  let match = assets.find(
    (a) =>
      a.name.toLowerCase().includes(suffix.toLowerCase()) &&
      a.name.endsWith(ext),
  );

  // Fallback: just platform match
  if (!match) {
    match = assets.find((a) =>
      a.name.toLowerCase().includes(suffix.toLowerCase()),
    );
  }

  // macOS fallback: try just "darwin" or "macos"
  if (!match && platform === "darwin") {
    match = assets.find(
      (a) =>
        (a.name.toLowerCase().includes("darwin") ||
          a.name.toLowerCase().includes("macos")) &&
        (a.name.endsWith(".zip") || a.name.endsWith(".dmg")),
    );
  }

  // Windows fallback: try just "win"
  if (!match && platform === "win32") {
    match = assets.find(
      (a) =>
        a.name.toLowerCase().includes("win") &&
        (a.name.endsWith(".zip") || a.name.endsWith(".exe")),
    );
  }

  if (!match) return null;
  return {
    name: match.name,
    url: match.browser_download_url,
    size: match.size,
  };
}

/** Format bytes into a human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Calculate download percentage, safe for zero total */
export function calcPercent(transferred: number, total: number): number {
  return total > 0 ? Math.round((transferred / total) * 100) : 0;
}
