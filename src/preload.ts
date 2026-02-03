import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    addTask: (task: any) => ipcRenderer.invoke('add-task', task),
    updateTask: (task: any) => ipcRenderer.invoke('update-task', task),
    getTask: (id: string) => ipcRenderer.invoke('get-task', id),
    onActivityUpdate: (callback: (activity: any) => void) => ipcRenderer.on('activity-update', (_event, value) => callback(value)),

    // Monitoring Control
    startMonitoring: () => ipcRenderer.invoke('start-monitoring'),
    stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),
    onSystemEvent: (callback: (event: any) => void) => ipcRenderer.on('system-event', (_event, value) => callback(value)),

    // Debug and system info
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    openUserDataFolder: () => ipcRenderer.invoke('open-user-data-folder'),
    openLogFile: () => ipcRenderer.invoke('open-log-file'),
    getDbContents: () => ipcRenderer.invoke('get-db-contents'),
    saveGoals: (goals: string[]) => ipcRenderer.invoke('save-goals', goals),
});
