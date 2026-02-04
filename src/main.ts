import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createLogger, getLogPath } from './lib/logger';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const logger = createLogger('Main');

if (started) {
  app.quit();
}

// Main DB for Tasks and Goals
let db: any = { data: { tasks: [], goals: [], ratings: [] } }; 
let dbFilePath: string;

// Daily Activity DB
let activityDb: any;
let currentActivityDate: string = '';
let isAppReady = false; 

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
    db = new Low(adapter, { tasks: [], goals: [], ratings: [] });
    await db.read();
    db.data ||= { tasks: [], goals: [], ratings: [] };
    // Migration for old "goal" property if needed
    if (!db.data.goals && (db.data as any).goal) {
       db.data.goals = [(db.data as any).goal];
    }
    db.data.goals ||= [];
    db.data.ratings ||= [];
    await db.write();

    // Initialize Activity DB immediately to ensure folder structure
    await getActivityDb();

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    dialog.showErrorBox('Database Initialization Error', `Failed to load database: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
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
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
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

const startMonitoring = async (): Promise<boolean> => {
  if (monitoringInterval) {
    logger.info('Monitoring already running');
    return true;
  }

  if (!mainWindow) {
    logger.error('Cannot start monitoring: No main window');
    return false;
  }

  logger.info('Starting activity monitoring...');
  try {
    const activeWinModule = await import('active-win');
    const activeWin = activeWinModule.default;

    // Test run to ensure it works immediately
    try {
        await activeWin();
    } catch (initialError) {
         throw initialError; // Throw so we land in the outer catch block
    }

    monitoringInterval = setInterval(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        logger.warn('Main window destroyed, stopping monitoring');
        stopMonitoring();
        return;
      }

      try {
        const result = await activeWin();
        if (result) {
          // ... (same logic as before)
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

          if (!lastActivity || lastActivity.owner.name !== activity.owner.name) {
             mainWindow.webContents.send('system-event', {
               type: 'SYS_PROCESS_SWITCH',
               content: `Process Context Switch: ${lastActivity?.owner?.name || 'init'} -> ${activity.owner.name}`,
               timestamp,
               details: { pid: result.owner.processId, path: result.owner.path }
             });
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
              existingActivity.duration += 1000; 
              
              activity.duration = existingActivity.duration;
              activity.timestamp = existingActivity.timestamp; 

              if (timestamp % 10000 < 1500) { 
                  currentDb.write().catch((e: any) => {});
              }
          } else {
              activity.duration = 1000; 
              currentDb.data.activities.push(activity);
              currentDb.write().catch((e: any) => logger.error('Failed to write activity to DB:', e));
          }

          lastActivity = activity;
          mainWindow.webContents.send('activity-update', activity);
        }
      } catch (error) {
        logger.error("Error getting active window:", error);
        stopMonitoring();
        
        let errorMessage = "Failed to access active window.";
        if (process.platform === 'linux') {
            errorMessage += "\n\nLinux Note: Ensure you have 'xprop' installed. If you are on Wayland, switch to X11/Xorg as Wayland blocks activity monitoring by design.";
        }
        dialog.showErrorBox("Activity Monitoring Failed", errorMessage + "\n\nDetails: " + String(error));
      }
    }, 1000); 

    logger.info('Activity monitoring started');
    return true;
  } catch (e) {
    logger.error("Failed to load active-win:", e);
    dialog.showErrorBox("Monitoring Error", "Failed to load monitoring module. " + String(e));
    return false;
  }
};


function registerIpcHandlers() {
    // Task management handlers
    ipcMain.handle('get-tasks', async () => {
      try {
        const currentActivityDb = await getActivityDb();
        return {
            tasks: db.data.tasks,
            goals: db.data.goals || [],
            activities: currentActivityDb?.data?.activities || [],
            ratings: db.data.ratings || []
        };
      } catch (e) {
          logger.error('Failed in get-tasks', e);
          dialog.showErrorBox('Data Loading Error', 'Failed to retrieve tasks and activities. ' + String(e));
          return { tasks: [], goals: [], activities: [], ratings: [] };
      }
    });

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
    ipcMain.handle('get-system-info', async () => {
      let distro = 'unknown';
      if (process.platform === 'linux') {
          try {
              const osRelease = await fs.readFile('/etc/os-release', 'utf-8');
              const lines = osRelease.split('\n');
              const idLine = lines.find(line => line.startsWith('ID='));
              const idLikeLine = lines.find(line => line.startsWith('ID_LIKE='));
              
              if (idLine) {
                  distro = idLine.split('=')[1].replace(/"/g, '').toLowerCase();
              }
              // Fallback or addition checks could be here, but ID usually suffices for Arch (ID=arch)
              if (distro === 'unknown' && idLikeLine) {
                   distro = idLikeLine.split('=')[1].replace(/"/g, '').toLowerCase();
              }
          } catch (e) {
              logger.error('Failed to read os-release', e);
          }
      }

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
        distro
      };
    });

    ipcMain.handle('open-user-data-folder', () => {
      const userDataPath = app.getPath('userData');
      shell.openPath(userDataPath);
      return userDataPath;
    });

    ipcMain.handle('open-log-file', () => {
      const logPath = getLogPath();
      shell.openPath(path.dirname(logPath));
      return logPath;
    });

    ipcMain.handle('get-db-contents', async () => {
      const currentActivityDb = await getActivityDb();
      return {
        tasks: db.data.tasks,
        activities: currentActivityDb?.data?.activities || [],
        goals: db.data.goals || [],
      };
    });

    ipcMain.handle('start-monitoring', async () => {
        return await startMonitoring();
    });

    ipcMain.handle('stop-monitoring', () => {
        stopMonitoring();
    });

    logger.info('All IPC handlers registered successfully');
}

app.on('ready', async () => {
  logger.info('=== Produchive Starting ===');
  try {
    // 1. Register IPC handlers IMMEDIATELY (they will safely wait or error if db is missing, but "No handler" error will be gone)
    registerIpcHandlers();
    
    // 2. Initialize DB
    await initDB();
    
    // 3. Mark app as ready and create window
    isAppReady = true;
    createWindow();

  } catch (error) {
    logger.error('Error during app initialization:', error);
    dialog.showErrorBox('Startup Error', 'Critical error during starting up: ' + String(error));
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  logger.info('App activated');
  // Only create window if the app is fully ready and initialized
  if (isAppReady && BrowserWindow.getAllWindows().length === 0) {
    logger.info('No windows open, creating new window');
    createWindow();
  } else if (!isAppReady) {
      logger.info('App activated but not yet ready/initialized. Waiting...');
  }
});

app.on('will-quit', () => {
  // No logger call here as per instruction
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Uncaught Exception', error.message + '\n' + error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  dialog.showErrorBox('Unhandled Rejection', String(reason));
});