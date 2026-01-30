export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
}

declare global {
    interface Window {
        electronAPI: {
            getTasks: () => Promise<Task[]>;
            addTask: (task: Task) => Promise<Task[]>;
            updateTask: (task: Task) => Promise<Task[]>;
            deleteTask: (id: string) => Promise<Task[]>;
        }
    }
}
