export interface Task {
    id: string;
    text: string;
    completed: boolean;
    createdAt: number;
    createdAtReadable?: string;
}

export interface Activity {
    title: string;
    owner: {
        name: string;
        path: string;
    };
    timestamp: number;
    timestampReadable?: string;
    duration?: number;
}

export interface SystemInfo {
    userDataPath: string;
    appPath: string;
    dbPath: string;
    logPath: string;
    versions: {
        electron: string;
        chrome: string;
        node: string;
    };
    platform: string;
    arch: string;
    distro?: string;
}

declare global {
    interface Window {
        electronAPI: {
            getTasks: () => Promise<Task[]>;
            addTask: (task: Task) => Promise<Task[]>;
            updateTask: (task: Task) => Promise<Task[]>;
            deleteTask: (id: string) => Promise<Task[]>;
            onActivityUpdate: (callback: (activity: Activity) => void) => void;

            stopMonitoring: () => Promise<void>;
            startMonitoring: () => Promise<boolean>;
            onSystemEvent: (callback: (event: any) => void) => void;

            // Debug and system info
            getSystemInfo: () => Promise<SystemInfo>;
            openUserDataFolder: () => Promise<string>;
            openLogFile: () => Promise<string>;
            getDbContents: () => Promise<{ tasks: Task[]; activities: Activity[]; goal: string | null }>;
            saveGoals: (goals: string[]) => Promise<string[]>;
            saveRating: (rating: any) => Promise<any>;
        }
    }
}
