import { SyncDataPayload } from './syncCrypto';
import { PlannedRoutineItem } from '../types/routine';
import { useStore } from './store';

export interface MergeSummary {
  tasksAdded: number;
  tasksUpdated: number;
  routinesAdded: number;
  routinesUpdated: number;
  goalsAdded: number;
  focusSessionsAdded: number;
  ratingsAdded: number;
  totalTasks: number;
  totalRoutines: number;
}

const DEVICE_ID_KEY = 'produchive_device_id';
const DEVICE_NAME_KEY = 'produchive_device_name';
const MASTER_ROUTINES_KEY = 'produchive_master_routines';

/**
 * Returns a persistent unique device identifier.
 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).substring(2, 12));
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_unknown';
  }
}

/**
 * Returns user-friendly device name (e.g. "MacBook Pro" or "Desktop").
 */
export function getDeviceName(): string {
  try {
    const saved = localStorage.getItem(DEVICE_NAME_KEY);
    if (saved) return saved;

    const nav = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let name = 'Produchive Client';
    if (nav.includes('Macintosh')) name = 'Mac Device';
    else if (nav.includes('Windows')) name = 'Windows PC';
    else if (nav.includes('Linux')) name = 'Linux Device';

    localStorage.setItem(DEVICE_NAME_KEY, name);
    return name;
  } catch {
    return 'Produchive Device';
  }
}

export function setDeviceName(name: string) {
  try {
    localStorage.setItem(DEVICE_NAME_KEY, name.trim());
  } catch (e) {
    console.error('Failed to save device name:', e);
  }
}

/**
 * Collects all current local data from Electron DB and localStorage into a SyncDataPayload.
 */
export async function exportLocalSyncPayload(): Promise<SyncDataPayload> {
  let dbData: any = { tasks: [], goals: [], ratings: [], focusSessions: [], settings: {} };

  if (window.electronAPI?.exportSyncData) {
    try {
      dbData = await window.electronAPI.exportSyncData();
    } catch (err) {
      console.warn('Failed to call exportSyncData IPC, falling back to store:', err);
    }
  }

  // Fallback to store if IPC returned empty or unavailable
  const store = useStore.getState();
  const tasks = (dbData.tasks && dbData.tasks.length > 0) ? dbData.tasks : store.tasks;
  const goals = (dbData.goals && dbData.goals.length > 0) ? dbData.goals : store.goals;
  const ratings = (dbData.ratings && dbData.ratings.length > 0) ? dbData.ratings : store.ratings;
  const focusSessions = dbData.focusSessions || [];

  // Routines from localStorage
  let routines: PlannedRoutineItem[] = [];
  try {
    const rawRoutines = localStorage.getItem(MASTER_ROUTINES_KEY);
    if (rawRoutines) {
      routines = JSON.parse(rawRoutines);
    } else {
      routines = store.routines || [];
    }
  } catch (e) {
    routines = store.routines || [];
  }

  const settings = {
    selectedRole: store.selectedRole,
    customPrompt: store.customPrompt,
    selectedModelId: store.selectedModelId,
    ...(dbData.settings || {}),
  };

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    timestamp: Date.now(),
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    data: {
      tasks: tasks || [],
      routines: routines || [],
      goals: goals || [],
      ratings: ratings || [],
      focusSessions: focusSessions || [],
      settings,
    },
  };
}

/**
 * Pure helper to merge tasks arrays without side effects (testable).
 */
export function mergeTasksArrays(
  localTasks: any[],
  remoteTasks: any[],
  mode: 'merge' | 'overwrite' = 'merge'
): { merged: any[]; added: number; updated: number } {
  if (mode === 'overwrite') {
    return { merged: [...remoteTasks], added: remoteTasks.length, updated: 0 };
  }

  const merged = [...localTasks];
  const localMap = new Map(merged.map((t) => [t.id, t]));
  let added = 0;
  let updated = 0;

  for (const rTask of remoteTasks) {
    if (!rTask || !rTask.id) continue;
    const existing = localMap.get(rTask.id);
    if (!existing) {
      merged.push(rTask);
      localMap.set(rTask.id, rTask);
      added++;
    } else {
      // Check if remote is newer or has updated completion status
      const remoteCreated = Number(rTask.created) || 0;
      const existingCreated = Number(existing.created) || 0;
      const changed =
        existing.completed !== rTask.completed ||
        existing.text !== rTask.text ||
        remoteCreated > existingCreated;

      if (changed) {
        Object.assign(existing, rTask);
        updated++;
      }
    }
  }

  return { merged, added, updated };
}

/**
 * Pure helper to merge routines arrays without side effects (testable).
 */
export function mergeRoutinesArrays(
  localRoutines: PlannedRoutineItem[],
  remoteRoutines: PlannedRoutineItem[],
  mode: 'merge' | 'overwrite' = 'merge'
): { merged: PlannedRoutineItem[]; added: number; updated: number } {
  if (mode === 'overwrite') {
    return { merged: [...remoteRoutines], added: remoteRoutines.length, updated: 0 };
  }

  const merged = [...localRoutines];
  const localMap = new Map(merged.map((r) => [r.id, r]));
  let added = 0;
  let updated = 0;

  for (const rRoutine of remoteRoutines) {
    if (!rRoutine || !rRoutine.id) continue;
    const existing = localMap.get(rRoutine.id);
    if (!existing) {
      merged.push(rRoutine);
      localMap.set(rRoutine.id, rRoutine);
      added++;
    } else {
      const changed =
        existing.completed !== rRoutine.completed ||
        existing.title !== rRoutine.title ||
        existing.dateStr !== rRoutine.dateStr ||
        existing.startHour !== rRoutine.startHour ||
        existing.startMinute !== rRoutine.startMinute ||
        existing.durationMinutes !== rRoutine.durationMinutes;

      if (changed) {
        Object.assign(existing, rRoutine);
        updated++;
      }
    }
  }

  return { merged, added, updated };
}

/**
 * Pure helper to merge goal lists.
 */
export function mergeGoalsArrays(
  localGoals: string[],
  remoteGoals: string[],
  mode: 'merge' | 'overwrite' = 'merge'
): { merged: string[]; added: number } {
  if (mode === 'overwrite') {
    return { merged: [...remoteGoals], added: remoteGoals.length };
  }

  const merged = [...localGoals];
  const set = new Set(merged.map((g) => (g || '').trim().toLowerCase()));
  let added = 0;

  for (const g of remoteGoals) {
    const norm = (g || '').trim().toLowerCase();
    if (norm && !set.has(norm)) {
      merged.push(g.trim());
      set.add(norm);
      added++;
    }
  }

  return { merged, added };
}

/**
 * Merges a remote SyncDataPayload into local storage (LowDB, localStorage, and Zustand store).
 */
export async function mergeSyncPayload(
  remote: SyncDataPayload,
  mode: 'merge' | 'overwrite' = 'merge'
): Promise<MergeSummary> {
  const store = useStore.getState();

  // 1. Load local routines
  let localRoutines: PlannedRoutineItem[] = [];
  try {
    const raw = localStorage.getItem(MASTER_ROUTINES_KEY);
    localRoutines = raw ? JSON.parse(raw) : (store.routines || []);
  } catch {
    localRoutines = store.routines || [];
  }

  // 2. Perform merges
  const remoteTasks = remote.data.tasks || [];
  const remoteRoutines = remote.data.routines || [];
  const remoteGoals = remote.data.goals || [];
  const remoteRatings = remote.data.ratings || [];
  const remoteSessions = remote.data.focusSessions || [];

  const taskMerge = mergeTasksArrays(store.tasks || [], remoteTasks, mode);
  const routineMerge = mergeRoutinesArrays(localRoutines, remoteRoutines, mode);
  const goalMerge = mergeGoalsArrays(store.goals || [], remoteGoals, mode);

  // 3. Persist routines locally
  try {
    localStorage.setItem(MASTER_ROUTINES_KEY, JSON.stringify(routineMerge.merged));
    store.setRoutines(routineMerge.merged);
    window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
  } catch (err) {
    console.error('Failed to persist merged routines:', err);
  }

  // 4. Persist DB items via batch IPC if available
  if (window.electronAPI?.importSyncData) {
    try {
      await window.electronAPI.importSyncData({
        tasks: taskMerge.merged,
        goals: goalMerge.merged,
        ratings: remoteRatings,
        focusSessions: remoteSessions,
        settings: remote.data.settings,
        mode,
      });
    } catch (err) {
      console.error('Failed to import sync data into LowDB via IPC:', err);
    }
  }

  // 5. Reload store to ensure fresh data in UI
  try {
    await store.loadTasks();
    store.loadRoutines();
  } catch (err) {
    console.error('Failed to reload store after sync:', err);
  }

  return {
    tasksAdded: taskMerge.added,
    tasksUpdated: taskMerge.updated,
    routinesAdded: routineMerge.added,
    routinesUpdated: routineMerge.updated,
    goalsAdded: goalMerge.added,
    focusSessionsAdded: remoteSessions.length,
    ratingsAdded: remoteRatings.length,
    totalTasks: taskMerge.merged.length,
    totalRoutines: routineMerge.merged.length,
  };
}
