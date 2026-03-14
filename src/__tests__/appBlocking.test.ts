/**
 * Tests for the app blocking feature.
 * 
 * Tests cover:
 * 1. Block/unblock state management (pure logic)
 * 2. Activity aggregation and sorting (blocked apps float to top)
 * 3. App name normalization for AppleScript
 * 4. Edge cases (duplicate blocks, unknown apps, etc.)
 * 
 * Run with:   npm test
 * Watch mode: npm run test:watch
 */

import { describe, it, expect } from 'vitest';

// ─── Extracted pure functions to test ────────────────────────────────────────

// Simulates the Map-based blockedActivities storage in main.ts
function createBlockStore() {
  const blocked = new Map<string, any>();
  return {
    block: (activity: any) => {
      const key = activity.owner.name;
      blocked.set(key, activity);
      return Array.from(blocked.values());
    },
    unblock: (activity: any) => {
      const key = activity.owner.name;
      blocked.delete(key);
      return Array.from(blocked.values());
    },
    isBlocked: (appName: string) => blocked.has(appName),
    getAll: () => Array.from(blocked.values()),
    size: () => blocked.size,
  };
}

// Simulates the normalizeAppName logic from applyBlockMode in main.ts
function normalizeAppName(name: string): string {
  if (name === "Chrome") return "Google Chrome";
  if (name === "Brave") return "Brave Browser";
  if (name === "Edge") return "Microsoft Edge";
  return name;
}

// Simulates the ActivityMonitor's aggregation logic
function aggregateActivities(activities: any[]): { name: string; duration: number; titles: string[] }[] {
  const appUsage: Record<string, { name: string; duration: number; titles: string[] }> = {};
  activities.forEach(act => {
    const duration = act.duration ? act.duration / 1000 : 1;
    const appName = act.owner.name;
    if (!appUsage[appName]) {
      appUsage[appName] = { name: appName, duration: 0, titles: [] };
    }
    appUsage[appName].duration += duration;
    if (!appUsage[appName].titles.includes(act.title)) {
      appUsage[appName].titles.push(act.title);
    }
  });
  return Object.values(appUsage).sort((a, b) => b.duration - a.duration);
}

// Simulates sorting: blocked apps first, then by duration
function sortApps(
  appSummary: { name: string; duration: number }[],
  blockedActivities: any[],
): { name: string; duration: number }[] {
  const isBlocked = (name: string) => blockedActivities.some((a: any) => a.owner.name === name);
  const blocked = appSummary.filter(a => isBlocked(a.name));
  const unblocked = appSummary.filter(a => !isBlocked(a.name));
  return [...blocked, ...unblocked];
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const makeActivity = (appName: string, title: string, duration = 5000) => ({
  title,
  owner: { name: appName, path: `/Applications/${appName}.app` },
  timestamp: Date.now(),
  duration,
});

// ─── 1. Block Store (Map-based state management) ────────────────────────────

describe('Block Store', () => {
  it('starts empty', () => {
    const store = createBlockStore();
    expect(store.size()).toBe(0);
    expect(store.getAll()).toEqual([]);
  });

  it('blocks an app', () => {
    const store = createBlockStore();
    const activity = makeActivity('Google Chrome', 'GitHub');
    const result = store.block(activity);
    expect(result).toHaveLength(1);
    expect(store.isBlocked('Google Chrome')).toBe(true);
    expect(store.isBlocked('Safari')).toBe(false);
  });

  it('unblocks an app', () => {
    const store = createBlockStore();
    const activity = makeActivity('Google Chrome', 'GitHub');
    store.block(activity);
    expect(store.isBlocked('Google Chrome')).toBe(true);

    const result = store.unblock(activity);
    expect(result).toHaveLength(0);
    expect(store.isBlocked('Google Chrome')).toBe(false);
  });

  it('blocks multiple apps', () => {
    const store = createBlockStore();
    store.block(makeActivity('Google Chrome', 'GitHub'));
    store.block(makeActivity('Slack', 'General'));
    store.block(makeActivity('Spotify', 'Now Playing'));
    expect(store.size()).toBe(3);
    expect(store.isBlocked('Google Chrome')).toBe(true);
    expect(store.isBlocked('Slack')).toBe(true);
    expect(store.isBlocked('Spotify')).toBe(true);
  });

  it('unblocking a non-blocked app is a no-op', () => {
    const store = createBlockStore();
    store.block(makeActivity('Slack', 'General'));
    const result = store.unblock(makeActivity('Google Chrome', 'GitHub'));
    expect(result).toHaveLength(1); // Slack still blocked
    expect(store.isBlocked('Slack')).toBe(true);
  });

  it('blocking the same app twice overwrites (no duplicates)', () => {
    const store = createBlockStore();
    store.block(makeActivity('Google Chrome', 'GitHub'));
    store.block(makeActivity('Google Chrome', 'Twitter'));
    expect(store.size()).toBe(1);
    // The stored activity should be the latest one
    expect(store.getAll()[0].title).toBe('Twitter');
  });

  it('keys by app name, not by title', () => {
    const store = createBlockStore();
    store.block(makeActivity('Google Chrome', 'GitHub'));
    // Different title, same app — should still be blocked
    expect(store.isBlocked('Google Chrome')).toBe(true);
    // Unblock with a different title but same app name
    store.unblock(makeActivity('Google Chrome', 'Reddit'));
    expect(store.isBlocked('Google Chrome')).toBe(false);
  });
});

// ─── 2. App Name Normalization ──────────────────────────────────────────────

describe('normalizeAppName', () => {
  it('normalizes "Chrome" to "Google Chrome"', () => {
    expect(normalizeAppName('Chrome')).toBe('Google Chrome');
  });

  it('normalizes "Brave" to "Brave Browser"', () => {
    expect(normalizeAppName('Brave')).toBe('Brave Browser');
  });

  it('normalizes "Edge" to "Microsoft Edge"', () => {
    expect(normalizeAppName('Edge')).toBe('Microsoft Edge');
  });

  it('passes through already-correct names', () => {
    expect(normalizeAppName('Google Chrome')).toBe('Google Chrome');
    expect(normalizeAppName('Safari')).toBe('Safari');
    expect(normalizeAppName('Slack')).toBe('Slack');
    expect(normalizeAppName('Cursor')).toBe('Cursor');
  });
});

// ─── 3. Activity Aggregation ────────────────────────────────────────────────

describe('aggregateActivities', () => {
  it('returns empty array for no activities', () => {
    expect(aggregateActivities([])).toEqual([]);
  });

  it('groups by app name and sums durations', () => {
    const activities = [
      makeActivity('Google Chrome', 'GitHub', 10000),
      makeActivity('Google Chrome', 'Twitter', 5000),
      makeActivity('Slack', 'General', 8000),
    ];
    const result = aggregateActivities(activities);
    expect(result).toHaveLength(2);
    // Chrome has 15s total, Slack has 8s — Chrome first
    expect(result[0].name).toBe('Google Chrome');
    expect(result[0].duration).toBe(15); // 15000ms / 1000
    expect(result[0].titles).toContain('GitHub');
    expect(result[0].titles).toContain('Twitter');
    expect(result[1].name).toBe('Slack');
    expect(result[1].duration).toBe(8);
  });

  it('sorts by duration descending', () => {
    const activities = [
      makeActivity('Slack', 'General', 2000),
      makeActivity('Google Chrome', 'GitHub', 10000),
      makeActivity('Finder', 'Documents', 5000),
    ];
    const result = aggregateActivities(activities);
    expect(result[0].name).toBe('Google Chrome');
    expect(result[1].name).toBe('Finder');
    expect(result[2].name).toBe('Slack');
  });

  it('handles activities without duration (defaults to 1s)', () => {
    const activities = [{ title: 'Test', owner: { name: 'TestApp', path: '/test' }, timestamp: Date.now() }];
    const result = aggregateActivities(activities);
    expect(result[0].duration).toBe(1);
  });

  it('collects unique titles per app', () => {
    const activities = [
      makeActivity('Google Chrome', 'GitHub', 1000),
      makeActivity('Google Chrome', 'GitHub', 2000), // duplicate title
      makeActivity('Google Chrome', 'Twitter', 3000),
    ];
    const result = aggregateActivities(activities);
    expect(result[0].titles).toEqual(['GitHub', 'Twitter']);
  });
});

// ─── 4. Sorting — Blocked Apps Float to Top ─────────────────────────────────

describe('sortApps (blocked first)', () => {
  it('moves blocked apps to the top', () => {
    const apps = [
      { name: 'Google Chrome', duration: 100 },
      { name: 'Slack', duration: 50 },
      { name: 'Spotify', duration: 30 },
    ];
    const blocked = [makeActivity('Spotify', 'Now Playing')];
    const result = sortApps(apps, blocked);
    expect(result[0].name).toBe('Spotify'); // blocked → first
    expect(result[1].name).toBe('Google Chrome');
    expect(result[2].name).toBe('Slack');
  });

  it('preserves order when nothing is blocked', () => {
    const apps = [
      { name: 'Google Chrome', duration: 100 },
      { name: 'Slack', duration: 50 },
    ];
    const result = sortApps(apps, []);
    expect(result[0].name).toBe('Google Chrome');
    expect(result[1].name).toBe('Slack');
  });

  it('handles multiple blocked apps', () => {
    const apps = [
      { name: 'Google Chrome', duration: 100 },
      { name: 'Slack', duration: 50 },
      { name: 'Spotify', duration: 30 },
      { name: 'Finder', duration: 10 },
    ];
    const blocked = [
      makeActivity('Spotify', 'Now Playing'),
      makeActivity('Slack', 'General'),
    ];
    const result = sortApps(apps, blocked);
    // Blocked apps first (Slack and Spotify in original order among themselves)
    expect(result[0].name).toBe('Slack');
    expect(result[1].name).toBe('Spotify');
    // Then unblocked
    expect(result[2].name).toBe('Google Chrome');
    expect(result[3].name).toBe('Finder');
  });

  it('handles all apps blocked', () => {
    const apps = [
      { name: 'Google Chrome', duration: 100 },
      { name: 'Slack', duration: 50 },
    ];
    const blocked = [
      makeActivity('Google Chrome', 'GitHub'),
      makeActivity('Slack', 'General'),
    ];
    const result = sortApps(apps, blocked);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Google Chrome');
    expect(result[1].name).toBe('Slack');
  });
});

// ─── 5. Block → Unblock Round-Trip ──────────────────────────────────────────

describe('Block/Unblock Round-Trip', () => {
  it('block → verify blocked → unblock → verify unblocked', () => {
    const store = createBlockStore();
    const chrome = makeActivity('Google Chrome', 'GitHub');
    const slack = makeActivity('Slack', 'General');

    // Block both
    store.block(chrome);
    store.block(slack);
    expect(store.size()).toBe(2);

    // Verify sort puts them first
    const apps = [
      { name: 'Google Chrome', duration: 100 },
      { name: 'Slack', duration: 50 },
      { name: 'Finder', duration: 200 },
    ];
    let sorted = sortApps(apps, store.getAll());
    expect(sorted[0].name).toBe('Google Chrome');
    expect(sorted[1].name).toBe('Slack');
    expect(sorted[2].name).toBe('Finder');

    // Unblock Chrome
    store.unblock(chrome);
    expect(store.size()).toBe(1);
    expect(store.isBlocked('Google Chrome')).toBe(false);
    expect(store.isBlocked('Slack')).toBe(true);

    // Verify sort reflects the change
    sorted = sortApps(apps, store.getAll());
    expect(sorted[0].name).toBe('Slack'); // still blocked → first
    expect(sorted[1].name).toBe('Finder'); // highest duration unblocked
    expect(sorted[2].name).toBe('Google Chrome');

    // Unblock Slack
    store.unblock(slack);
    expect(store.size()).toBe(0);

    // Verify normal sort by duration
    sorted = sortApps(apps, store.getAll());
    expect(sorted[0].name).toBe('Finder'); // 200
    expect(sorted[1].name).toBe('Google Chrome'); // 100
    expect(sorted[2].name).toBe('Slack'); // 50
  });
});
