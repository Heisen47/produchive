export interface Task {
  id: string;
  text: string;
  completed: boolean;
  created: number;
  createdAt?: string;
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

export interface FocusSession {
  id: string;
  scene: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
  startedAtReadable: string;
  endedAtReadable: string;
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
      getScreenPermission: () => Promise<string>;
      openScreenPermissionSettings: () => Promise<void>;
      onSystemEvent: (callback: (event: any) => void) => void;

      // Blocking Control
      getBlockedActivities: () => Promise<Activity[]>;
      blockActivity: (activity: Activity) => Promise<Activity[]>;
      unblockActivity: (activity: Activity) => Promise<Activity[]>;

      // Debug and system info
      getSystemInfo: () => Promise<SystemInfo>;
      openUserDataFolder: () => Promise<string>;
      openLogFile: () => Promise<string>;
      saveGoals: (goals: string[]) => Promise<string[]>;
      saveRating: (rating: any) => Promise<any>;
      getRatingsByDate: (dateStr: string) => Promise<any[]>;
      saveActivityFeedback: (feedback: {
        id?: string;
        eventId?: string;
        appName: string;
        windowTitle?: string;
        inferredCategory: string;
        userFeedback: 'accurate' | 'inaccurate';
        correctedCategory?: string | null;
        correctedTitle?: string | null;
        durationMinutes?: number;
        confidence?: number;
      }) => Promise<{ success: boolean; feedback?: any; error?: string }>;
      getActivityFeedbacks: () => Promise<any[]>;
      getActivityDataByDate: (dateStr: string) => Promise<any>;
      getActivityDataRange: (
        startDate: string,
        endDate: string,
      ) => Promise<Record<string, { activities: Activity[] }>>;

      // Auto-launch
      getAutoLaunch: () => Promise<boolean>;
      setAutoLaunch: (enabled: boolean) => Promise<boolean>;

      // Update checker
      checkForUpdates: () => Promise<{
        currentVersion: string;
        latestVersion: string;
        updateAvailable: boolean;
        releaseNotes?: string;
        downloadUrl?: string;
      }>;
      downloadUpdate: () => Promise<{ success: boolean; filePath?: string }>;
      installUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (status: any) => void) => void;

      // App settings
      getSettings: () => Promise<Record<string, any>>;
      setSetting: (key: string, value: any) => Promise<Record<string, any>>;

      // Focus Room sessions
      saveFocusSession: (session: { scene: string; durationSeconds: number; startedAt: string }) => Promise<FocusSession>;
      getFocusSessions: () => Promise<FocusSession[]>;

      // External URLs & Safe Fetch
      openExternalUrl: (url: string) => Promise<void>;
      fetchUrl: (url: string, options?: any) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        data: string | null;
        error?: string;
      }>;
      googleOAuthLogin: (loginHint?: string) => Promise<{
        success: boolean;
        token?: string;
        email?: string;
        error?: string;
      }>;

      // Deep linking authentication events
      getPendingToken: () => Promise<string | null>;
      onAuthToken: (callback: (token: string) => void) => void;
      onGcalToken: (callback: (data: { gcalToken: string; gcalEmail: string }) => void) => void;
      showNotification: (options: { title: string; body: string }) => Promise<void>;
    };
  }
}

// Asset module declarations for Vite
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}
