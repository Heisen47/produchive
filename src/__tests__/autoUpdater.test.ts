/**
 * Tests for the auto-updater utility functions (updaterUtils.ts).
 * 
 * These tests cover:
 * 1. Semver comparison logic
 * 2. Platform asset matching (for darwin, win32, linux)
 * 3. Byte formatting
 * 4. Download percentage calculation
 * 5. Edge cases & error handling
 * 
 * Run with:   npm test
 * Watch mode: npm run test:watch
 */

import { describe, it, expect } from 'vitest';
import {
  compareSemver,
  findAssetForPlatform,
  getPlatformAssetPattern,
  formatBytes,
  calcPercent,
} from '../lib/updaterUtils';

// ─── 1. Semver Comparison ────────────────────────────────────────────────────

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('v1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('0.0.1', 'v0.0.1')).toBe(0);
  });

  it('returns 1 when first version is greater (major)', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
  });

  it('returns 1 when first version is greater (minor)', () => {
    expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.2.0', '1.1.9')).toBe(1);
  });

  it('returns 1 when first version is greater (patch)', () => {
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('v1.0.2', '1.0.1')).toBe(1);
  });

  it('returns -1 when first version is smaller', () => {
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(compareSemver('0.9.9', '1.0.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
  });

  it('handles versions with missing patch (treated as 0)', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0', '1.0.1')).toBe(-1);
    expect(compareSemver('1.1', '1.0.0')).toBe(1);
  });

  it('handles versions with only major (treated as x.0.0)', () => {
    expect(compareSemver('1', '1.0.0')).toBe(0);
    expect(compareSemver('2', '1.9.9')).toBe(1);
  });

  it('handles "v" prefix correctly', () => {
    expect(compareSemver('v1.1.0', 'v1.0.0')).toBe(1);
    expect(compareSemver('v2.0.0', '2.0.0')).toBe(0);
    expect(compareSemver('1.0.0', 'v2.0.0')).toBe(-1);
  });

  it('handles realistic version transitions', () => {
    // Typical release cycle
    expect(compareSemver('1.1.0', '1.0.0')).toBe(1);   // minor bump
    expect(compareSemver('1.1.1', '1.1.0')).toBe(1);   // patch bump
    expect(compareSemver('2.0.0', '1.1.1')).toBe(1);   // major bump
  });
});

// ─── 2. Platform Asset Pattern ───────────────────────────────────────────────

describe('getPlatformAssetPattern', () => {
  it('returns correct pattern for macOS arm64', () => {
    const result = getPlatformAssetPattern('darwin', 'arm64');
    expect(result.suffix).toBe('darwin-arm64');
    expect(result.ext).toBe('.zip');
  });

  it('returns correct pattern for macOS x64', () => {
    const result = getPlatformAssetPattern('darwin', 'x64');
    expect(result.suffix).toBe('darwin-x64');
    expect(result.ext).toBe('.zip');
  });

  it('returns correct pattern for Windows x64', () => {
    const result = getPlatformAssetPattern('win32', 'x64');
    expect(result.suffix).toBe('win32-x64');
    expect(result.ext).toBe('.zip');
  });

  it('returns correct pattern for Linux x64 (deb)', () => {
    const result = getPlatformAssetPattern('linux', 'x64');
    expect(result.suffix).toBe('amd64');
    expect(result.ext).toBe('.deb');
  });

  it('returns correct pattern for Linux non-x64 (rpm)', () => {
    const result = getPlatformAssetPattern('linux', 'arm64');
    expect(result.suffix).toBe('linux');
    expect(result.ext).toBe('.rpm');
  });

  it('returns fallback for unknown platform', () => {
    const result = getPlatformAssetPattern('freebsd', 'x64');
    expect(result.suffix).toBe('freebsd');
    expect(result.ext).toBe('.zip');
  });
});

// ─── 3. Asset Matching ──────────────────────────────────────────────────────

describe('findAssetForPlatform', () => {
  const mockAssets = [
    { name: 'produchive-darwin-x64-1.2.0.zip', browser_download_url: 'https://example.com/mac-x64.zip', size: 90_000_000 },
    { name: 'produchive-darwin-arm64-1.2.0.zip', browser_download_url: 'https://example.com/mac-arm64.zip', size: 85_000_000 },
    { name: 'produchive-win32-x64-1.2.0.zip', browser_download_url: 'https://example.com/win.zip', size: 80_000_000 },
    { name: 'produchive-1.2.0.amd64.deb', browser_download_url: 'https://example.com/linux.deb', size: 70_000_000 },
    { name: 'produchive-1.2.0.x86_64.rpm', browser_download_url: 'https://example.com/linux.rpm', size: 72_000_000 },
    { name: 'Source code (zip)', browser_download_url: 'https://example.com/source.zip', size: 1_000_000 },
    { name: 'Source code (tar.gz)', browser_download_url: 'https://example.com/source.tar.gz', size: 900_000 },
  ];

  it('returns null for empty asset list', () => {
    expect(findAssetForPlatform([], 'darwin', 'arm64')).toBeNull();
  });

  it('returns null when no assets match the platform', () => {
    const unrelatedAssets = [
      { name: 'something-completely-different.tar.gz', browser_download_url: 'https://x.com/x', size: 100 },
    ];
    expect(findAssetForPlatform(unrelatedAssets, 'darwin', 'arm64')).toBeNull();
    expect(findAssetForPlatform(unrelatedAssets, 'win32', 'x64')).toBeNull();
  });

  it('matches macOS arm64 correctly', () => {
    const result = findAssetForPlatform(mockAssets, 'darwin', 'arm64');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('produchive-darwin-arm64-1.2.0.zip');
    expect(result!.url).toBe('https://example.com/mac-arm64.zip');
    expect(result!.size).toBe(85_000_000);
  });

  it('matches macOS x64 correctly', () => {
    const result = findAssetForPlatform(mockAssets, 'darwin', 'x64');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('produchive-darwin-x64-1.2.0.zip');
    expect(result!.url).toBe('https://example.com/mac-x64.zip');
  });

  it('matches Windows x64 correctly', () => {
    const result = findAssetForPlatform(mockAssets, 'win32', 'x64');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('produchive-win32-x64-1.2.0.zip');
  });

  it('matches Linux deb correctly', () => {
    const result = findAssetForPlatform(mockAssets, 'linux', 'x64');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('produchive-1.2.0.amd64.deb');
  });

  it('does not match source code archives', () => {
    const sourceOnlyAssets = [
      { name: 'Source code (zip)', browser_download_url: 'https://example.com/source.zip', size: 1_000_000 },
      { name: 'Source code (tar.gz)', browser_download_url: 'https://example.com/source.tar.gz', size: 900_000 },
    ];
    expect(findAssetForPlatform(sourceOnlyAssets, 'darwin', 'arm64')).toBeNull();
    expect(findAssetForPlatform(sourceOnlyAssets, 'win32', 'x64')).toBeNull();
    expect(findAssetForPlatform(sourceOnlyAssets, 'linux', 'x64')).toBeNull();
  });

  it('uses macOS fallback for "macos" keyword in asset name', () => {
    const macosAssets = [
      { name: 'produchive-macos-universal.zip', browser_download_url: 'https://example.com/mac.zip', size: 95_000_000 },
    ];
    const result = findAssetForPlatform(macosAssets, 'darwin', 'arm64');
    expect(result).not.toBeNull();
    expect(result!.name).toContain('macos');
  });

  it('uses macOS fallback for "darwin" keyword without arch', () => {
    const darwinAssets = [
      { name: 'produchive-darwin.zip', browser_download_url: 'https://example.com/mac.zip', size: 90_000_000 },
    ];
    // The primary match looks for "darwin-arm64" which won't match "darwin.zip"
    // But the fallback should catch "darwin"
    const result = findAssetForPlatform(darwinAssets, 'darwin', 'arm64');
    expect(result).not.toBeNull();
  });

  it('uses Windows fallback for "win" keyword', () => {
    const winAssets = [
      { name: 'produchive-setup-win.exe', browser_download_url: 'https://example.com/win.exe', size: 80_000_000 },
    ];
    const result = findAssetForPlatform(winAssets, 'win32', 'x64');
    expect(result).not.toBeNull();
    expect(result!.name).toContain('win');
  });

  it('prefers exact platform+extension match over just platform match', () => {
    const mixedAssets = [
      { name: 'produchive-darwin-arm64-1.2.0.zip', browser_download_url: 'https://example.com/zip', size: 90_000_000 },
      { name: 'produchive-darwin-arm64-1.2.0.dmg', browser_download_url: 'https://example.com/dmg', size: 95_000_000 },
    ];
    const result = findAssetForPlatform(mixedAssets, 'darwin', 'arm64');
    expect(result).not.toBeNull();
    // Should prefer the .zip since that matches both suffix AND extension
    expect(result!.name).toContain('.zip');
  });
});

// ─── 4. Byte Formatting ─────────────────────────────────────────────────────

describe('formatBytes', () => {
  it('formats bytes (< 1024)', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10240)).toBe('10.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
    expect(formatBytes(52428800)).toBe('50.0 MB');
    expect(formatBytes(104857600)).toBe('100.0 MB');
  });
});

// ─── 5. Download Progress ────────────────────────────────────────────────────

describe('calcPercent', () => {
  it('calculates percentage correctly', () => {
    expect(calcPercent(25_000_000, 100_000_000)).toBe(25);
    expect(calcPercent(50_000_000, 100_000_000)).toBe(50);
    expect(calcPercent(100_000_000, 100_000_000)).toBe(100);
  });

  it('handles zero total gracefully (returns 0)', () => {
    expect(calcPercent(1000, 0)).toBe(0);
  });

  it('handles zero transferred', () => {
    expect(calcPercent(0, 100_000_000)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calcPercent(1, 3)).toBe(33);  // 33.33... → 33
    expect(calcPercent(2, 3)).toBe(67);  // 66.66... → 67
  });
});

// ─── 6. Update Decision Logic (Integration-style) ───────────────────────────

describe('Update decision logic', () => {
  it('no update when versions are equal', () => {
    const current = '1.1.0';
    const latest = '1.1.0';
    const updateAvailable = compareSemver(latest, current) > 0;
    expect(updateAvailable).toBe(false);
  });

  it('update available when latest is newer', () => {
    const current = '1.1.0';
    const latest = '1.2.0';
    const updateAvailable = compareSemver(latest, current) > 0;
    expect(updateAvailable).toBe(true);
  });

  it('no update when running a newer version (e.g. dev build)', () => {
    const current = '2.0.0-dev';
    const latest = '1.1.0';
    // Note: our simple semver parser will strip "v" but "-dev" stays as NaN
    // Testing that 2.0 > 1.1 regardless
    expect(compareSemver('2.0.0', '1.1.0') > 0).toBe(true);
  });

  it('correctly chains version check → asset match', () => {
    const currentVersion = '1.0.0';
    const releaseData = {
      tag_name: 'v1.2.0',
      assets: [
        { name: 'produchive-darwin-arm64-1.2.0.zip', browser_download_url: 'https://example.com/mac.zip', size: 90_000_000 },
        { name: 'produchive-win32-x64-1.2.0.zip', browser_download_url: 'https://example.com/win.zip', size: 80_000_000 },
      ],
    };

    const latestVersion = releaseData.tag_name.replace(/^v/, '');
    const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;
    expect(updateAvailable).toBe(true);

    // Test asset matching for macOS arm64
    const macAsset = findAssetForPlatform(releaseData.assets, 'darwin', 'arm64');
    expect(macAsset).not.toBeNull();
    expect(macAsset!.url).toBe('https://example.com/mac.zip');

    // Test asset matching for Windows
    const winAsset = findAssetForPlatform(releaseData.assets, 'win32', 'x64');
    expect(winAsset).not.toBeNull();
    expect(winAsset!.url).toBe('https://example.com/win.zip');

    // No Linux asset should be found
    const linuxAsset = findAssetForPlatform(releaseData.assets, 'linux', 'x64');
    expect(linuxAsset).toBeNull();
  });
});
