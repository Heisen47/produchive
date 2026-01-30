import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createLogger, getLogPath } from './lib/logger';

const logger = createLogger('Main');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  logger.info('Squirrel startup detected, quitting app');
  app.quit();
}

let db: any;
let dbFilePath: string;

async function initDB() {
  logger.info('Initializing database...');
  try {
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');

    dbFilePath = path.join(app.getPath('userData'), 'db.json');
    logger.info(`Database file location: ${dbFilePath}`);

    const adapter = new JSONFile(dbFilePath);
    db = new Low(adapter, { tasks: [], activities: [], goal: null });
    await db.read();
    db.data ||= { tasks: [], activities: [], goal: null };
    await db.write();

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

const createWindow = () => {
  logger.info('Creating main window...');

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  logger.info(`Window created with dimensions: 1200x900`);

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    logger.info(`Loading dev server URL: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    logger.info(`Loading production file: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    logger.debug('Opening DevTools for development');
    mainWindow.webContents.openDevTools();
  }

  const startMonitoring = async () => {
    logger.info('Starting activity monitoring...');
    try {
      const activeWinModule = await import('active-win');
      const activeWin = activeWinModule.default;

      logger.info('Active-win module loaded successfully');

      const interval = setInterval(async () => {
        if (mainWindow.isDestroyed()) {
          logger.warn('Main window destroyed, stopping monitoring');
          clearInterval(interval);
          return;
        }

        try {
          const result = await activeWin();
          if (result) {
            const activity = {
              title: result.title,
              owner: {
                name: result.owner.name,
                path: result.owner.path,
              },
              timestamp: Date.now(),
            };

            logger.debug(`Activity detected: ${result.owner.name} - ${result.title}`);
            mainWindow.webContents.send('activity-update', activity);
          }
        } catch (error) {
          logger.error("Error getting active window:", error);
        }
      }, 3000);

      logger.info('Activity monitoring started (interval: 3000ms)');
    } catch (e) {
      logger.error("Failed to load active-win:", e);
    }
  };

  startMonitoring();

  logger.info('Main window setup complete');
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  logger.info('=== Produchive Starting ===');
  logger.info(`Electron version: ${process.versions.electron}`);
  logger.info(`Chrome version: ${process.versions.chrome}`);
  logger.info(`Node version: ${process.versions.node}`);
  logger.info(`User data path: ${app.getPath('userData')}`);
  logger.info(`App path: ${app.getAppPath()}`);

  try {
    await initDB();
    createWindow();

    // Task management handlers
    ipcMain.handle('get-tasks', () => {
      logger.debug('IPC: get-tasks called');
      return db.data.tasks;
    });

    ipcMain.handle('add-task', async (event, task) => {
      logger.info(`IPC: add-task called - ${task.text}`);
      db.data.tasks.push(task);
      await db.write();
      return db.data.tasks;
    });

    ipcMain.handle('update-task', async (event, updatedTask) => {
      logger.info(`IPC: update-task called - ${updatedTask.id}`);
      const index = db.data.tasks.findIndex((t: any) => t.id === updatedTask.id);
      if (index !== -1) {
        db.data.tasks[index] = updatedTask;
        await db.write();
      }
      return db.data.tasks;
    });

    ipcMain.handle('delete-task', async (event, id) => {
      logger.info(`IPC: delete-task called - ${id}`);
      db.data.tasks = db.data.tasks.filter((t: any) => t.id !== id);
      await db.write();
      return db.data.tasks;
    });

    // Debug and system info handlers
    ipcMain.handle('get-system-info', () => {
      logger.debug('IPC: get-system-info called');
      return {
        userDataPath: app.getPath('userData'),
        appPath: app.getAppPath(),
        dbPath: dbFilePath,
        logPath: getLogPath(),
        versions: {
          electron: process.versions.electron,
          chrome: process.versions.chrome,
          node: process.versions.node,
        },
        platform: process.platform,
        arch: process.arch,
      };
    });

    ipcMain.handle('open-user-data-folder', () => {
      logger.info('IPC: open-user-data-folder called');
      const userDataPath = app.getPath('userData');
      shell.openPath(userDataPath);
      return userDataPath;
    });

    ipcMain.handle('open-log-file', () => {
      logger.info('IPC: open-log-file called');
      const logPath = getLogPath();
      shell.openPath(path.dirname(logPath));
      return logPath;
    });

    ipcMain.handle('get-db-contents', () => {
      logger.debug('IPC: get-db-contents called');
      return {
        tasks: db.data.tasks,
        activities: db.data.activities || [],
        goal: db.data.goal || null,
      };
    });

    logger.info('All IPC handlers registered successfully');
  } catch (error) {
    logger.error('Error during app initialization:', error);
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    logger.info('Quitting app (non-macOS platform)');
    app.quit();
  }
});

app.on('activate', () => {
  logger.info('App activated');
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.info('No windows open, creating new window');
    createWindow();
  }
});

app.on('will-quit', () => {
  logger.info('=== Produchive Shutting Down ===');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
