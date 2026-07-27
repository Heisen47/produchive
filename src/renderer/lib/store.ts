import { create } from 'zustand';
import { Task, Activity } from '../global';
import { DEFAULT_PROMPT } from './ai';



interface Store {
    tasks: Task[];
    goals: string[];
    activities: Activity[];
    ratings: any[];
    stats: { streak: number };
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
    selectedRole: 'Software Engineer', // Default
    selectedModelId: localStorage.getItem('selectedModelId'),
    setSelectedRole: (role: string) => {
        set({ selectedRole: role });
        window.electronAPI.setSetting('selectedRole', role);
    },
    setSelectedModel: (modelId: string) => {
        set({ selectedModelId: modelId });
        localStorage.setItem('selectedModelId', modelId);
    },
    customPrompt: localStorage.getItem('customPrompt') || DEFAULT_PROMPT,
    setCustomPrompt: (prompt: string) => {
        set({ customPrompt: prompt });
        localStorage.setItem('customPrompt', prompt);
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
        productivityDna: null,
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
        get().loadBlockedActivities();
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
    },
    toggleTask: async (id: string) => {
        const task = get().tasks.find((t) => t.id === id);
        if (task) {
            const updated = { ...task, completed: !task.completed };
            const tasks = await window.electronAPI.updateTask(updated);
            set({ tasks });
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
        }
    },
    editGoal: (index: number, newGoal: string) => {
        const { goals } = get();
        const newGoals = [...goals];
        newGoals[index] = newGoal;
        set({ goals: newGoals });
        window.electronAPI.saveGoals(newGoals);
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
}));
