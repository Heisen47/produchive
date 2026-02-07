import { create } from 'zustand';
import { Task, Activity } from '../global';

interface Store {
    tasks: Task[];
    goals: string[];
    activities: Activity[];
    ratings: any[];
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
    systemEvents: any[]; // Using any to avoid circular dependency if SystemEvent not imported, but prefer SystemEvent
    setMonitoring: (status: boolean) => void;
    addSystemEvent: (event: any) => void;
    clearSystemEvents: () => void;

    // Global Error Handling
    error: string | null;
    setError: (error: string | null) => void;
}

export const useStore = create<Store>((set, get) => ({
    tasks: [],
    goals: [],
    activities: [],
    ratings: [],
    error: null,
    setError: (error) => set({ error }),
    loadTasks: async () => {
        const { tasks, activities, goals, ratings } = await window.electronAPI.getTasks() as any;
        set({
            tasks: tasks || [],
            activities: activities || [],
            goals: goals || [],
            ratings: ratings || []
        });
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
    setMonitoring: (isMonitoring: boolean) => set({ isMonitoring }),
    addSystemEvent: (event: any) => {
        const { systemEvents } = get();
        // Keep last 100 events
        const newEvents = [...systemEvents, event].slice(-100);
        set({ systemEvents: newEvents });
    },
    clearSystemEvents: () => set({ systemEvents: [] }),
}));
