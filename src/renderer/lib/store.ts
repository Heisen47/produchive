import { create } from 'zustand';
import { Task, Activity } from '../global';
import { PlannedRoutineItem } from '../types/routine';
import { DEFAULT_PROMPT, isLegacyDefaultPrompt } from './ai';
import { syncTaskToRoutineCalendar, syncMultipleGoalsToRoutineCalendar } from './routineSync';
import {
    AppMode,
    CreateCustomModeInput,
    ModesPersistedState,
    applyModeActivationToState,
    buildTargetBlockedActivities,
    createCustomModeRecord,
    getDefaultBlockedAppsForMode,
    hydrateModesState,
    readModesStateFromLocalStorage,
    sanitizeBlockedAppsList,
    writeModesStateToLocalStorage,
} from './modes';

interface Store {
    tasks: Task[];
    goals: string[];
    activities: Activity[];
    ratings: any[];
    stats: { streak: number };

    // Master Routine Calendar
    routines: PlannedRoutineItem[];
    loadRoutines: () => void;
    setRoutines: (routines: PlannedRoutineItem[]) => void;
    addRoutine: (routine: PlannedRoutineItem) => void;
    updateRoutine: (routine: PlannedRoutineItem) => void;
    toggleRoutineComplete: (routineId: string) => Promise<void>;
    deleteRoutine: (routineId: string) => void;

    loadTasks: () => Promise<void>;
    addTask: (text: string) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    addGoal: (goal: string) => void;
    editGoal: (index: number, goal: string) => void;
    removeGoal: (index: number) => void;
    setGoals: (goals: string[]) => void;
    addActivity: (activity: Activity) => void;
    addRating: (rating: any) => void;

    // Monitoring
    isMonitoring: boolean;
    systemEvents: any[];
    blockedActivities: Activity[];
    setMonitoring: (status: boolean) => void;
    addSystemEvent: (event: any) => void;
    clearSystemEvents: () => void;
    
    // Blocking
    loadBlockedActivities: () => Promise<void>;
    blockActivity: (activity: Activity) => Promise<void>;
    unblockActivity: (activity: Activity) => Promise<void>;

    // Modes (Focus, Relax, Deep Work, Study, Meeting, Creative, Custom)
    modesState: ModesPersistedState;
    loadModesState: () => Promise<void>;
    activateMode: (modeId: string, durationMinutes?: number | null) => Promise<AppMode | null>;
    setActiveModeDuration: (durationMinutes: number | null) => Promise<void>;
    updateModeApps: (modeId: string, blockedApps: string[]) => Promise<void>;
    addCustomMode: (input: CreateCustomModeInput) => Promise<AppMode>;
    deleteCustomMode: (modeId: string) => Promise<void>;
    resetModeToDefault: (modeId: string) => Promise<void>;
    clearModeHistory: () => Promise<void>;

    // Debug / Testing
    setStreak: (streak: number) => void;

    // AI Settings
    selectedModelId: string | null;
    setSelectedModel: (modelId: string) => void;
    customPrompt: string;
    setCustomPrompt: (prompt: string) => void;

    // User Settings
    selectedRole: string | null;
    setSelectedRole: (role: string) => void;
    
    // Premium Status
    isPremium: boolean;
    setPremium: (status: boolean) => void;

    // Global Error Handling
    error: string | null;
    setError: (error: string | null) => void;
    
    // Auth
    user: any | null;
    setUser: (user: any | null) => void;

    // Activity Analytics Platform Slices
    analytics: {
        focusScore: number;
        focusSeconds: number;
        idleSeconds: number;
        contextSwitches: number;
        topApps: Array<{ name: string; seconds: number }>;
        productivityDna: { categories: Record<string, number>; dominantCategory: string } | null;
    };
    setAnalytics: (analytics: Partial<Store['analytics']>) => void;

    coach: {
        insights: string[];
        recommendations: string[];
    };
    setCoachData: (insights: string[], recommendations: string[]) => void;

    backendGoals: Array<{ id: string; title: string; targetMinutes: number; currentMinutes: number; deadline?: string; status: string }>;
    setBackendGoals: (goals: Store['backendGoals']) => void;

    weeklyReports: Array<{ id: string; weekStartDate: string; totalFocusHours: number; topCategory: string; aiSummary: string }>;
    setWeeklyReports: (reports: Store['weeklyReports']) => void;

    experiments: Array<{ id: string; title: string; status: string; baselineFocusScore: number; currentFocusScore: number }>;
    setExperiments: (experiments: Store['experiments']) => void;

    syncState: {
        isSyncing: boolean;
        pendingEventsCount: number;
    };
    setSyncState: (syncState: Partial<Store['syncState']>) => void;
}


export const useStore = create<Store>((set, get) => ({
    tasks: [],
    goals: [],
    activities: [],
    ratings: [],
    stats: { streak: 0 },
    routines: (() => {
        try {
            const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('produchive_master_routines') : null;
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    })(),
    loadRoutines: () => {
        try {
            const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('produchive_master_routines') : null;
            if (saved) {
                set({ routines: JSON.parse(saved) });
            }
        } catch (e) {
            console.error('Failed to load routines into store:', e);
        }
    },
    setRoutines: (routines) => {
        set({ routines });
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('produchive_master_routines', JSON.stringify(routines));
                window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
            }
        } catch (e) {
            console.error('Failed to persist routines:', e);
        }
    },
    addRoutine: (routine) => {
        const current = get().routines;
        const updated = [...current, routine];
        get().setRoutines(updated);
    },
    updateRoutine: (routine) => {
        const current = get().routines;
        const updated = current.map(r => r.id === routine.id ? routine : r);
        get().setRoutines(updated);
    },
    toggleRoutineComplete: async (routineId: string) => {
        const routines = [...get().routines];
        const target = routines.find(r => r.id === routineId);
        if (!target) return;

        const newCompleted = !target.completed;
        const updatedRoutines = routines.map(r => r.id === routineId ? { ...r, completed: newCompleted } : r);
        set({ routines: updatedRoutines });
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('produchive_master_routines', JSON.stringify(updatedRoutines));
                window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
            }
        } catch (e) {
            console.error(e);
        }

        // Bidirectional sync: find matching task in tasks list and toggle it in DB too!
        const targetTitle = target.title.trim().toLowerCase();
        const matchingTask = get().tasks.find(t => 
            target.taskId === t.id ||
            t.text.trim().toLowerCase() === targetTitle ||
            targetTitle.includes(t.text.trim().toLowerCase())
        );

        if (matchingTask && matchingTask.completed !== newCompleted && window.electronAPI?.updateTask) {
            const updatedTask = { ...matchingTask, completed: newCompleted };
            const tasks = await window.electronAPI.updateTask(updatedTask);
            set({ tasks });
        }
    },
    deleteRoutine: (routineId: string) => {
        const current = get().routines;
        const updated = current.filter(r => r.id !== routineId);
        get().setRoutines(updated);
    },
    selectedRole: 'Software Engineer', // Default
    selectedModelId: typeof localStorage !== 'undefined' ? localStorage.getItem('selectedModelId') : null,
    setSelectedRole: (role: string) => {
        set({ selectedRole: role });
        window.electronAPI?.setSetting?.('selectedRole', role);
    },
    setSelectedModel: (modelId: string) => {
        set({ selectedModelId: modelId });
        if (typeof localStorage !== 'undefined') localStorage.setItem('selectedModelId', modelId);
    },
    customPrompt: (() => {
        const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('customPrompt') : null;
        return saved && !isLegacyDefaultPrompt(saved) ? saved : DEFAULT_PROMPT;
    })(),
    setCustomPrompt: (prompt: string) => {
        set({ customPrompt: prompt });
        if (typeof localStorage !== 'undefined') localStorage.setItem('customPrompt', prompt);
    },
    isPremium: false,
    setPremium: (status: boolean) => {
        set({ isPremium: status });
        // In a real app, persist this securely
    },
    user: null,
    setUser: (user: any | null) => set({ 
        user,
        isPremium: user ? !!user.isPremium : false
    }),
    error: null,
    setError: (error) => set({ error }),

    // Activity Analytics Platform Initial Slices & Actions
    analytics: {
        focusScore: 0,
        focusSeconds: 0,
        idleSeconds: 0,
        contextSwitches: 0,
        topApps: [],
        productivityDna: {
            categories: {},
            dominantCategory: ''
        },
    },
    setAnalytics: (newAnalytics) =>
        set((state) => ({ analytics: { ...state.analytics, ...newAnalytics } })),

    coach: {
        insights: [],
        recommendations: [],
    },
    setCoachData: (insights, recommendations) => set({ coach: { insights, recommendations } }),

    backendGoals: [],
    setBackendGoals: (backendGoals) => set({ backendGoals }),

    weeklyReports: [],
    setWeeklyReports: (weeklyReports) => set({ weeklyReports }),

    experiments: [],
    setExperiments: (experiments) => set({ experiments }),


    syncState: {
        isSyncing: false,
        pendingEventsCount: 0,
    },
    setSyncState: (newSyncState) =>
        set((state) => ({ syncState: { ...state.syncState, ...newSyncState } })),

    loadTasks: async () => {
        const { tasks, activities, goals, ratings, stats } = await window.electronAPI.getTasks() as any;
        const settings = await window.electronAPI.getSettings();
        
        set({
            tasks: tasks || [],
            activities: activities || [],
            goals: goals || [],
            ratings: ratings || [],
            stats: stats || { streak: 0 },
            selectedRole: settings.selectedRole || 'Software Engineer' // Default if not set
        });
        get().loadRoutines();
        await get().loadBlockedActivities();
        await get().loadModesState();
    },
    addTask: async (text: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            text,
            completed: false,
            created: Date.now(),
            createdAt: new Date().toLocaleString(),
        };
        const tasks = await window.electronAPI.addTask(newTask);
        set({ tasks });
        // Automatically reflect in Routine calendar
        syncTaskToRoutineCalendar(text);
    },
    toggleTask: async (id: string) => {
        const task = get().tasks.find((t) => t.id === id);
        if (task) {
            const updated = { ...task, completed: !task.completed };
            const tasks = await window.electronAPI.updateTask(updated);
            set({ tasks });

            // Bidirectional sync: toggle matching calendar routine
            const routines = [...get().routines];
            let changed = false;
            const normalizedTaskText = task.text.trim().toLowerCase();
            const updatedRoutines = routines.map((r) => {
                const matchesId = r.taskId === id;
                const matchesTitle =
                    r.title.trim().toLowerCase() === normalizedTaskText ||
                    r.title.trim().toLowerCase().includes(normalizedTaskText) ||
                    normalizedTaskText.includes(r.title.trim().toLowerCase());
                if ((matchesId || matchesTitle) && r.completed !== updated.completed) {
                    changed = true;
                    return { ...r, completed: updated.completed };
                }
                return r;
            });

            if (changed) {
                set({ routines: updatedRoutines });
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('produchive_master_routines', JSON.stringify(updatedRoutines));
                        window.dispatchEvent(new CustomEvent('produchive_routine_updated'));
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        }
    },
    deleteTask: async (id: string) => {
        const tasks = await window.electronAPI.deleteTask(id);
        set({ tasks });
    },
    addGoal: (goal: string) => {
        const { goals } = get();
        if (goals.length < 5) {
            const newGoals = [...goals, goal];
            set({ goals: newGoals });
            window.electronAPI.saveGoals(newGoals);
            // Automatically reflect in Routine calendar
            syncTaskToRoutineCalendar(goal);
        }
    },
    editGoal: (index: number, newGoal: string) => {
        const { goals } = get();
        const newGoals = [...goals];
        newGoals[index] = newGoal;
        set({ goals: newGoals });
        window.electronAPI.saveGoals(newGoals);
        syncTaskToRoutineCalendar(newGoal);
    },
    removeGoal: (index: number) => {
        const { goals } = get();
        const newGoals = goals.filter((_, i) => i !== index);
        set({ goals: newGoals });
        window.electronAPI.saveGoals(newGoals);
    },
    setGoals: (goals: string[]) => {
        set({ goals });
        window.electronAPI.saveGoals(goals);
        syncMultipleGoalsToRoutineCalendar(goals);
    },
    addActivity: (activity: Activity) => {
        const { activities } = get();
        const existingActivityIndex = activities.findIndex(a =>
            a.title === activity.title && a.owner.name === activity.owner.name
        );

        if (existingActivityIndex !== -1) {
            // Update existing activity (duration)
            const updatedActivities = [...activities];
            updatedActivities[existingActivityIndex] = activity;
            set({ activities: updatedActivities });
        } else {
            // Add new activity
            set({ activities: [...activities, activity] });
        }
    },
    addRating: (rating: any) => {
        const { ratings } = get();
        set({ ratings: [...ratings, rating] });
        window.electronAPI.saveRating(rating);
    },

    // Monitoring State
    isMonitoring: false,
    systemEvents: [],
    blockedActivities: [],
    setMonitoring: (isMonitoring: boolean) => set({ isMonitoring }),
    addSystemEvent: (event: any) => {
        const { systemEvents } = get();
        // Keep last 100 events
        const newEvents = [...systemEvents, event].slice(-100);
        set({ systemEvents: newEvents });
    },
    setStreak: (streak: number) => {
        const { stats } = get();
        set({ stats: { ...stats, streak } });
    },
    clearSystemEvents: () => set({ systemEvents: [] }),

    loadBlockedActivities: async () => {
        const blockedActivities = await window.electronAPI.getBlockedActivities();
        set({ blockedActivities });
    },
    blockActivity: async (activity: Activity) => {
        const blockedActivities = await window.electronAPI.blockActivity(activity);
        set({ blockedActivities });
    },
    unblockActivity: async (activity: Activity) => {
        const blockedActivities = await window.electronAPI.unblockActivity(activity);
        set({ blockedActivities });
    },

    modesState: readModesStateFromLocalStorage(),
    loadModesState: async () => {
        try {
            let persisted: any = null;
            if (window.electronAPI?.getModesState) {
                persisted = await window.electronAPI.getModesState();
            }
            const hydrated = persisted
                ? hydrateModesState(persisted)
                : readModesStateFromLocalStorage();

            // If an auto-relax timer already expired while the app was closed, fall back to relax mode
            let resolved = hydrated;
            if (
                hydrated.activeModeId !== 'relax' &&
                hydrated.autoRelaxAt &&
                Date.now() >= hydrated.autoRelaxAt
            ) {
                const { nextState } = applyModeActivationToState(hydrated, 'relax');
                resolved = nextState;
                writeModesStateToLocalStorage(resolved);
                window.electronAPI?.saveModesState?.(resolved).catch(() => {});
            } else {
                writeModesStateToLocalStorage(resolved);
            }

            set({ modesState: resolved });

            // Re-sync OS blocking state with persisted active mode (including clearing stale blocks if Relax)
            const activeMode = resolved.modes.find((m) => m.id === resolved.activeModeId);
            if (activeMode && window.electronAPI?.setBlockedActivities) {
                const targets = buildTargetBlockedActivities(activeMode, get().activities);
                if (targets.length > 0 || get().blockedActivities.length > 0) {
                    const blockedActivities = await window.electronAPI.setBlockedActivities(targets);
                    set({ blockedActivities });
                }
            }
        } catch (err) {
            console.error('[Modes] Failed to load local modes state:', err);
        }
    },
    activateMode: async (modeId: string, durationMinutes?: number | null) => {
        const current = get().modesState;
        const { nextState, targetMode } = applyModeActivationToState(current, modeId, {
            durationMinutes,
        });
        if (!targetMode) return null;

        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch((err) => {
            console.error('[Modes] Failed to persist modes state to disk:', err);
        });

        const targets = buildTargetBlockedActivities(targetMode, get().activities);
        if (window.electronAPI?.setBlockedActivities) {
            const blockedActivities = await window.electronAPI.setBlockedActivities(targets);
            set({ blockedActivities });
        } else {
            set({ blockedActivities: targets });
        }

        return targetMode;
    },
    setActiveModeDuration: async (durationMinutes: number | null) => {
        const current = get().modesState;
        const activeMode = current.modes.find((m) => m.id === current.activeModeId);
        if (!activeMode || activeMode.behavior === 'unblock_all') return;

        const autoRelaxAt =
            durationMinutes && durationMinutes > 0
                ? Date.now() + Math.round(durationMinutes * 60 * 1000)
                : null;

        const nextState: ModesPersistedState = {
            ...current,
            autoRelaxAt,
        };
        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch((err) => {
            console.error('[Modes] Failed to persist timer update to disk:', err);
        });
    },
    updateModeApps: async (modeId: string, blockedApps: string[]) => {
        const current = get().modesState;
        const sanitized = sanitizeBlockedAppsList(blockedApps);
        const updatedModes = current.modes.map((m) =>
            m.id === modeId && m.behavior !== 'unblock_all'
                ? { ...m, blockedApps: sanitized }
                : m
        );
        const nextState: ModesPersistedState = {
            ...current,
            modes: updatedModes,
        };
        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch(() => {});

        // If this mode is currently active, immediately re-apply OS blocks
        if (current.activeModeId === modeId) {
            const activeMode = updatedModes.find((m) => m.id === modeId);
            if (activeMode && window.electronAPI?.setBlockedActivities) {
                const targets = buildTargetBlockedActivities(activeMode, get().activities);
                const blockedActivities = await window.electronAPI.setBlockedActivities(targets);
                set({ blockedActivities });
            }
        }
    },
    addCustomMode: async (input: CreateCustomModeInput) => {
        const newMode = createCustomModeRecord(input);
        const current = get().modesState;
        const nextState: ModesPersistedState = {
            ...current,
            modes: [...current.modes, newMode],
        };
        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch(() => {});
        return newMode;
    },
    deleteCustomMode: async (modeId: string) => {
        const current = get().modesState;
        const target = current.modes.find((m) => m.id === modeId);
        if (!target || target.isBuiltIn) return;

        // If deleting the active custom mode, switch back to relax mode first
        if (current.activeModeId === modeId) {
            await get().activateMode('relax');
        }

        const latest = get().modesState;
        const nextState: ModesPersistedState = {
            ...latest,
            modes: latest.modes.filter((m) => m.id !== modeId),
        };
        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch(() => {});
    },
    resetModeToDefault: async (modeId: string) => {
        const defaults = getDefaultBlockedAppsForMode(modeId);
        if (defaults === null) return;
        await get().updateModeApps(modeId, defaults);
    },
    clearModeHistory: async () => {
        const current = get().modesState;
        const nextState: ModesPersistedState = {
            ...current,
            history: [],
        };
        set({ modesState: nextState });
        writeModesStateToLocalStorage(nextState);
        window.electronAPI?.saveModesState?.(nextState).catch(() => {});
    },
}));

if (typeof window !== 'undefined') {
    window.addEventListener('produchive_routine_updated', () => {
        useStore.getState().loadRoutines();
    });
    window.addEventListener('storage', (e) => {
        if (e.key === 'produchive_master_routines') {
            useStore.getState().loadRoutines();
        }
    });
}
