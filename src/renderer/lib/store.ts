import { create } from 'zustand';
import { Task, Activity } from '../global';

interface Store {
    tasks: Task[];
    goal: string | null;
    activities: Activity[];
    loadTasks: () => Promise<void>;
    addTask: (text: string) => Promise<void>;
    toggleTask: (id: string) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    setGoal: (goal: string) => void;
    addActivity: (activity: Activity) => void;
    
    // Monitoring
    isMonitoring: boolean;
    systemEvents: any[]; // Using any to avoid circular dependency if SystemEvent not imported, but prefer SystemEvent
    setMonitoring: (status: boolean) => void;
    addSystemEvent: (event: any) => void;
    clearSystemEvents: () => void;
}

export const useStore = create<Store>((set, get) => ({
    tasks: [],
    goal: null,
    activities: [],
    loadTasks: async () => {
        const tasks = await window.electronAPI.getTasks();
        set({ tasks });
    },
    addTask: async (text: string) => {
        const newTask: Task = {
            id: crypto.randomUUID(),
            text,
            completed: false,
            createdAt: Date.now(),
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
    setGoal: (goal: string) => set({ goal }),
    addActivity: (activity: Activity) => {
        const { activities } = get();
        const lastActivity = activities[activities.length - 1];
        // Only add if different from last activity title/app
        if (!lastActivity || lastActivity.title !== activity.title || lastActivity.owner.name !== activity.owner.name) {
            set({ activities: [...activities, activity] });
        }
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
