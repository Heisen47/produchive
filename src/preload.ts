import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    addTask: (task: any) => ipcRenderer.invoke('add-task', task),
    updateTask: (task: any) => ipcRenderer.invoke('update-task', task),
    deleteTask: (id: string) => ipcRenderer.invoke('delete-task', id),
});
