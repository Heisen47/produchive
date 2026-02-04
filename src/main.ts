import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createLogger, getLogPath } from './lib/logger';

const logger = createLogger('Main');

if (started) {
  app.quit();
}

// Main DB for Tasks and Goals
let db: any;
let dbFilePath: string;

// Daily Activity DB
let activityDb: any;
let currentActivityDate: string = '';

async function getActivityDb() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // If we already have a DB for today, return it
  if (activityDb && currentActivityDate === today) {
    return activityDb;
  }

  // Initialize new daily DB
  const { Low } = await import('lowdb');
  const { JSONFile } = await import('lowdb/node');
  const fs = await import('node:fs/promises');

  const logsDir = path.join(app.getPath('userData'), 'activity_logs');
  
  // Ensure logs directory exists
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }

  const activityFilePath = path.join(logsDir, `activity-${today}.json`);
  // logger.info(`Daily Activity DB: ${activityFilePath}`);

  const adapter = new JSONFile(activityFilePath);
  activityDb = new Low(adapter, { activities: [] });
  await activityDb.read();
  activityDb.data ||= { activities: [] };
  await activityDb.write();

  currentActivityDate = today;
  return activityDb;
}

async function initDB() {
  logger.info('Initializing main database...');
  try {
    const { Low } = await import('lowdb');
    const { JSONFile } = await import('lowdb/node');

    dbFilePath = path.join(app.getPath('userData'), 'db.json');
    logger.info(`Database file location: ${dbFilePath}`);

    const adapter = new JSONFile(dbFilePath);
    // Main DB only needs tasks and goals now. 'activities' removed from main DB schema.
    db = new Low(adapter, { tasks: [], goals: [], ratings: [] });
    await db.read();
    db.data ||= { tasks: [], goals: [], ratings: [] };
    // Migration for old "goal" property if needed, but we start fresh or keep both for safety
    if (!db.data.goals && (db.data as any).goal) {
       db.data.goals = [(db.data as any).goal];
    }
    db.data.goals ||= [];
    db.data.ratings ||= [];
    await db.write();

    // Initialize Activity DB immediately to ensure folder structure
    await getActivityDb();

    // logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // logger.info('Creating main window...');

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // logger.info(`Loading dev server URL: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    // logger.info(`Loading production file: ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // logger.debug('Opening DevTools for development');
    mainWindow.webContents.openDevTools();
  }

  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../resources/icon.png'));
  }

};

let monitoringInterval: NodeJS.Timeout | null = null;
let lastActivity: any = null;

const stopMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info('Monitoring stopped');
  }
};

const startMonitoring = async () => {
  if (monitoringInterval) {
    logger.info('Monitoring already running');
    return;
  }

  if (!mainWindow) {
    logger.error('Cannot start monitoring: No main window');
    return;
  }

  logger.info('Starting activity monitoring...');
  try {
    const activeWinModule = await import('active-win');
    const activeWin = activeWinModule.default;

    // logger.info('Active-win module loaded successfully');

    monitoringInterval = setInterval(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        logger.warn('Main window destroyed, stopping monitoring');
        stopMonitoring();
        return;
      }

      try {
        const result = await activeWin();
        if (result) {
          // SKIP monitoring if the active window is this app (Produchive) or Electron wrapper
          const appName = result.owner.name.toLowerCase();
          if (appName.includes('produchive') || appName.includes('electron')) {
             return;
          }

          const browsers = ['Google Chrome', 'Chrome', 'Brave', 'Safari', 'Firefox', 'Microsoft Edge'];
          if (browsers.some(b => result.owner.name.includes(b)) && result.title.toLowerCase().includes('leetcode')) { 
             result.title = 'LeetCode'; 
          }

          const timestamp = Date.now();
          const activity = {
            title: result.title,
            owner: {
              name: result.owner.name,
              path: result.owner.path,
            },
            timestamp,
            duration: 0
          };

          // Detect changes for system simulation
          if (!lastActivity || lastActivity.owner.name !== activity.owner.name) {
             mainWindow.webContents.send('system-event', {
               type: 'SYS_PROCESS_SWITCH',
               content: `Process Context Switch: ${lastActivity?.owner?.name || 'init'} -> ${activity.owner.name}`,
               timestamp,
               details: { pid: result.owner.processId, path: result.owner.path }
             });
             // Log only when activity actually changes/switches app
             console.log(`Activity detected: ${result.owner.name} - ${result.title}`);
          }

           if (!lastActivity || lastActivity.title !== activity.title) {
             mainWindow.webContents.send('system-event', {
               type: 'SYS_WINDOW_FOCUS',
               content: `Window Focus Change: "${activity.title}"`,
               timestamp
             });
          }

         
          const currentDb = await getActivityDb(); 
          const existingActivity = currentDb.data.activities.find((a: any) => 
              a.title === activity.title && a.owner.name === activity.owner.name
          );

          if (existingActivity) {
             
              if (typeof existingActivity.duration !== 'number') existingActivity.duration = 0;
              
              existingActivity.duration += 1000; // Add 1s
              
              activity.duration = existingActivity.duration;
              activity.timestamp = existingActivity.timestamp; 

              // Write periodically (e.g. every 10s) to prevent data loss but avoid disk thrashing
              if (timestamp % 10000 < 1500) { 
                  currentDb.write().catch((e: any) => {});
              }
          } else {
              // New Activity for today
              activity.duration = 1000; // Initialize with 1s
              currentDb.data.activities.push(activity);
     
              currentDb.write().catch((e: any) => logger.error('Failed to write activity to DB:', e));
          }

          lastActivity = activity;
          // logger.debug(`Activity detected: ${result.owner.name} - ${result.title}`); // Removed noisy debug log
          mainWindow.webContents.send('activity-update', activity);
        }
      } catch (error) {
        logger.error("Error getting active window:", error);
      }
    }, 1000); // Poll every 1 second for more "real-time" feel

    logger.info('Activity monitoring started');
  } catch (e) {
    logger.error("Failed to load active-win:", e);
  }
};

app.on('ready', async () => {
  logger.info('=== Produchive Starting ===');
  // logger.info(`Electron version: ${process.versions.electron}`);
  // logger.info(`Chrome version: ${process.versions.chrome}`);
  // logger.info(`Node version: ${process.versions.node}`);
  // logger.info(`User data path: ${app.getPath('userData')}`);
  // logger.info(`App path: ${app.getAppPath()}`);

  try {
    await initDB();
    createWindow();

    // Task management handlers
    ipcMain.handle('get-tasks', async () => {
      // logger.debug('IPC: get-tasks called');
      // Return composite data to ensure everything load on start
      const currentActivityDb = await getActivityDb();
      return {
          tasks: db.data.tasks,
          goals: db.data.goals || [],
          activities: currentActivityDb.data.activities || [],
          ratings: db.data.ratings || []
      };
    });

    ipcMain.handle('add-task', async (event, task) => {
      // logger.info(`IPC: add-task called - ${task.text}`);
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

    ipcMain.handle('save-goals', async (event, goals) => {
      if (Array.isArray(goals)) {
        db.data.goals = goals;
        await db.write();
      }
      return db.data.goals;
    });

    ipcMain.handle('save-rating', async (event, rating) => {
        const newRating = { 
            ...rating, 
            timestamp: Date.now(),
            id: crypto.randomUUID()
        };
        db.data.ratings.push(newRating);
        await db.write();
        return newRating;
    });

    // Debug and system info handlers
    ipcMain.handle('get-system-info', () => {
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
      // logger.info('IPC: open-user-data-folder called');
      const userDataPath = app.getPath('userData');
      shell.openPath(userDataPath);
      return userDataPath;
    });

    ipcMain.handle('open-log-file', () => {
      // logger.info('IPC: open-log-file called');
      const logPath = getLogPath();
      shell.openPath(path.dirname(logPath));
      return logPath;
    });

    ipcMain.handle('get-db-contents', async () => {
      // logger.debug('IPC: get-db-contents called');
      const currentActivityDb = await getActivityDb();
      return {
        tasks: db.data.tasks,
        activities: currentActivityDb.data.activities || [],
        goals: db.data.goals || [],
      };
    });

    // Helper to get everything at once (mapped to getTasks in frontend roughly)
    // Actually, store calls getTasks() but backend has get-tasks. 
    // Wait, the renderer calls `window.electronAPI.getTasks()`.
    // I need to verify what `preload.ts` maps `getTasks` to.
    // Assuming it maps to `get-tasks` channel (or `get-db-contents`? I will check preload).
    // For now, I'll update `get-tasks` channel just in case.


    ipcMain.handle('start-monitoring', () => {
        // logger.info('IPC: start-monitoring called');
        startMonitoring();
    });

    ipcMain.handle('stop-monitoring', () => {
        // logger.info('IPC: stop-monitoring called');
        stopMonitoring();
    });

    // logger.info('All IPC handlers registered successfully');
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