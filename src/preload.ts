import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getTasks: () => ipcRenderer.invoke("get-tasks"),
  addTask: (task: any) => ipcRenderer.invoke("add-task", task),
  updateTask: (task: any) => ipcRenderer.invoke("update-task", task),
  getTask: (id: string) => ipcRenderer.invoke("get-task", id),
  onActivityUpdate: (callback: (activity: any) => void) =>
    ipcRenderer.on("activity-update", (_event, value) => callback(value)),

  // Monitoring Control
  startMonitoring: () => ipcRenderer.invoke("start-monitoring"),
  stopMonitoring: () => ipcRenderer.invoke("stop-monitoring"),
  getScreenPermission: () => ipcRenderer.invoke("get-screen-permission"),
  openScreenPermissionSettings: () =>
    ipcRenderer.invoke("open-screen-permission-settings"),
  onSystemEvent: (callback: (event: any) => void) =>
    ipcRenderer.on("system-event", (_event, value) => callback(value)),

  // Blocking Control
  getBlockedActivities: () => ipcRenderer.invoke("get-blocked-activities"),
  blockActivity: (activity: any) => ipcRenderer.invoke("block-activity", activity),
  unblockActivity: (activity: any) => ipcRenderer.invoke("unblock-activity", activity),

  // Debug and system info
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  openUserDataFolder: () => ipcRenderer.invoke("open-user-data-folder"),
  openLogFile: () => ipcRenderer.invoke("open-log-file"),
  getDbContents: () => ipcRenderer.invoke("get-db-contents"),
  saveGoals: (goals: string[]) => ipcRenderer.invoke("save-goals", goals),
  saveRating: (rating: any) => ipcRenderer.invoke("save-rating", rating),
  getRatingsByDate: (dateStr: string) =>
    ipcRenderer.invoke("get-ratings-by-date", dateStr),
  saveActivityFeedback: (feedback: any) =>
    ipcRenderer.invoke("save-activity-feedback", feedback),
  getActivityFeedbacks: () => ipcRenderer.invoke("get-activity-feedbacks"),
  getActivityDataByDate: (dateStr: string) =>
    ipcRenderer.invoke("get-activity-data-by-date", dateStr),
  getActivityDataRange: (startDate: string, endDate: string) =>
    ipcRenderer.invoke("get-activity-data-range", startDate, endDate),

  // Auto-launch
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled: boolean) =>
    ipcRenderer.invoke("set-auto-launch", enabled),

  // Update checker
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback: (status: any) => void) => {
    ipcRenderer.removeAllListeners("update-status");
    ipcRenderer.on("update-status", (_event, value) => callback(value));
  },

  // App lifecycle
  onBeforeQuit: (callback: () => void) => {
    ipcRenderer.on("app-before-quit", () => callback());
  },

  // Focus Room sessions
  saveFocusSession: (session: any) => ipcRenderer.invoke("save-focus-session", session),
  getFocusSessions: () => ipcRenderer.invoke("get-focus-sessions"),

  // App settings
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSetting: (key: string, value: any) =>
    ipcRenderer.invoke("set-setting", key, value),

  // External URLs & Safe Fetch
  openExternalUrl: (url: string) => ipcRenderer.invoke("open-external-url", url),
  fetchUrl: (url: string, options?: any) => ipcRenderer.invoke("fetch-url", { url, options }),
  googleOAuthLogin: (clientId?: string) => ipcRenderer.invoke("google-oauth-login", clientId),

  // Deep linking authentication events
  getPendingToken: () => ipcRenderer.invoke("get-pending-token"),
  onAuthToken: (callback: (token: string) => void) => {
    ipcRenderer.removeAllListeners("on-auth-token");
    ipcRenderer.on("on-auth-token", (_event, value) => callback(value));
  },
  onGcalToken: (callback: (data: { gcalToken: string; gcalEmail: string }) => void) => {
    ipcRenderer.removeAllListeners("on-gcal-token");
    ipcRenderer.on("on-gcal-token", (_event, value) => callback(value));
  },
});

