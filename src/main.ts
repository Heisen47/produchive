import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let db: any;

async function initDB() {
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');

  const file = path.join(app.getPath('userData'), 'db.json');
  const adapter = new JSONFile(file);
  db = new Low(adapter, { tasks: [] });
  await db.read();
  db.data ||= { tasks: [] };
  await db.write();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  await initDB();
  createWindow();

  ipcMain.handle('get-tasks', () => db.data.tasks);

  ipcMain.handle('add-task', async (event, task) => {
    db.data.tasks.push(task);
    await db.write();
    return db.data.tasks;
  });

  ipcMain.handle('update-task', async (event, updatedTask) => {
    const index = db.data.tasks.findIndex((t: any) => t.id === updatedTask.id);
    if (index !== -1) {
      db.data.tasks[index] = updatedTask;
      await db.write();
    }
    return db.data.tasks;
  });

  ipcMain.handle('delete-task', async (event, id) => {
    db.data.tasks = db.data.tasks.filter((t: any) => t.id !== id);
    await db.write();
    return db.data.tasks;
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
