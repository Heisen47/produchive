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
}));
