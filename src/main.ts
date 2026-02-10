import { app, BrowserWindow, ipcMain, shell, dialog, systemPreferences, Tray, Menu, nativeImage, net } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createLogger, getLogPath } from './lib/logger';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';


const logger = createLogger('Main');

if (started) {
  app.quit();
}

app.commandLine.appendSwitch('disable-gpu-watchdog');
app.commandLine.appendSwitch('force_high_performance_gpu');
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
  activityDb = new Low(adapter, { activities: [], goals: [] });
  await activityDb.read();
  activityDb.data ||= { activities: [], goals: [] };
  // Ensure goals array exists for migration
  if (!activityDb.data.goals) activityDb.data.goals = [];
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

    // Migration to add readable timestamps
    let modified = false;
    db.data.tasks.forEach((task: any) => {
      if (!task.createdAt && task.created) {
        task.createdAt = new Date(task.created).toLocaleString();
        modified = true;
      }
    });
    db.data.ratings.forEach((rating: any) => {
      if (!rating.timestampReadable && rating.timestamp) {
        rating.timestampReadable = new Date(rating.timestamp).toLocaleString();
        modified = true;
      }
    });
    if (modified) {
      await db.write();
    }

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
let tray: Tray | null = null;
let isQuitting = false;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      partition: 'persist:main',
    },
    icon: (() => {
      if (process.platform === 'darwin') {
        return app.isPackaged
          ? path.join(process.resourcesPath, 'icon.icns')
          : path.join(__dirname, '../../resources/icon.icns');
      } else if (process.platform === 'win32') {
        return app.isPackaged
          ? path.join(process.resourcesPath, 'icon.ico')
          : path.join(__dirname, '../../resources/icon.ico');
      } else {
        return app.isPackaged
          ? path.join(process.resourcesPath, 'icon.png')
          : path.join(__dirname, '../../resources/icon.png');
      }
    })(),
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
    app.dock.setIcon(app.isPackaged
      ? path.join(process.resourcesPath, 'icon.png')
      : path.join(__dirname, '../../resources/icon.png')
    );
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });
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

const checkMacPermissions = () => {
  if (process.platform !== 'darwin') return true;

  // Check accessibility WITHOUT prompting system dialog (false = don't prompt)
  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
  if (!isTrusted) {
    // Now prompt the system dialog by calling with true
    systemPreferences.isTrustedAccessibilityClient(true);
    dialog.showErrorBox(
      'Accessibility Permission Required',
      'Produchive needs Accessibility permissions to monitor active windows.\n\n' +
      'Please enable it in System Settings > Privacy & Security > Accessibility.\n\n' +
      'After enabling, you may need to restart the app.'
    );
    return false;
  }

  const screenAccess = systemPreferences.getMediaAccessStatus('screen');
  if (screenAccess === 'denied' || screenAccess === 'not-determined') {
    logger.info(`Screen Recording permission status: ${screenAccess}`);
  }

  return true;
};

const startMonitoring = async (): Promise<boolean> => {
  if (monitoringInterval) {
    logger.info('Monitoring already running');
    return true;
  }

  if (!checkMacPermissions()) {
    return false;
  }

  if (!mainWindow) {
    logger.error('Cannot start monitoring: No main window');
    return false;
  }

  logger.info('Starting activity monitoring...');
  try {
    let activeWin;
    if (app.isPackaged) {
      const activeWinPath = path.join(process.resourcesPath, 'active-win');
      activeWin = require(activeWinPath);
    } else {
      activeWin = require('active-win');
    }

    // Test run to ensure it works immediately
    try {
      const testResult = await activeWin();
      logger.info('Active-win test successful:', testResult ? 'got window data' : 'null result');
    } catch (initialError: any) {
      logger.error('Active-win test failed:', {
        message: initialError?.message,
        stderr: initialError?.stderr,
        stdout: initialError?.stdout,
        code: initialError?.code,
      });
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
            timestampReadable: new Date(timestamp).toLocaleString(),
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

            // Backfill readable timestamp if missing
            if (!existingActivity.timestampReadable) {
              existingActivity.timestampReadable = new Date(existingActivity.timestamp).toLocaleString();
            }
            activity.timestampReadable = existingActivity.timestampReadable;

            if (timestamp % 10000 < 1500) {
              currentDb.write().catch((e: any) => { });
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
  } catch (e: any) {
    logger.error("Failed to start monitoring:", e);
    const errorMessage = e?.message || String(e);
    const stderr = e?.stderr || '';

    // Only show permission error if stderr explicitly mentions it
    const isScreenRecordingError = process.platform === 'darwin' && (
      stderr.includes('screen recording') ||
      errorMessage.includes('active-win/main')  // Binary failed = likely permission issue
    );

    if (isScreenRecordingError) {
      dialog.showErrorBox(
        "Screen Recording Permission Required",
        "Produchive needs Screen Recording permission to monitor active windows.\n\n" +
        "Please:\n" +
        "1. Open System Settings → Privacy & Security → Screen Recording\n" +
        "2. Enable the toggle for 'produchive'\n" +
        "3. Quit and restart this app (Cmd+Q, then reopen)\n\n" +
        "The permission won't take effect until you restart."
      );
    } else {
      // Show the actual error for debugging
      dialog.showErrorBox(
        "Monitoring Error",
        "Failed to start monitoring.\n\n" +
        "Error: " + errorMessage + "\n\n" +
        (stderr ? "Details: " + stderr : "")
      );
    }
    return false;
  }
};


function registerIpcHandlers() {
  // Task management handlers
  ipcMain.handle('get-tasks', async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const activityFilePath = path.join(app.getPath('userData'), 'activity_logs', `activity-${today}.json`);

      logger.info('========================================');
      logger.info('[get-tasks] Loading data for frontend');
      logger.info(`[get-tasks] Activity file: ${activityFilePath}`);
      logger.info(`[get-tasks] Main DB file: ${dbFilePath}`);

      const currentActivityDb = await getActivityDb();

      const todaysGoals = currentActivityDb?.data?.goals || [];

      logger.info(`[get-tasks] Goals loaded (today): ${todaysGoals.length}`);
      logger.info(`[get-tasks] Activities loaded: ${currentActivityDb?.data?.activities?.length || 0}`);
      logger.info(`[get-tasks] Ratings loaded: ${db.data.ratings?.length || 0}`);
      logger.info('========================================');

      return {
        tasks: db.data.tasks,
        goals: todaysGoals,
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
      // Save goals to the daily activity DB so they reset each day
      const currentActivityDb = await getActivityDb();
      currentActivityDb.data.goals = goals;
      await currentActivityDb.write();
      logger.info(`[save-goals] Saved ${goals.length} goals for today`);
      return goals;
    }
    return [];
  });

  ipcMain.handle('save-rating', async (event, rating) => {
    const newRating = {
      ...rating,
      timestamp: Date.now(),
      timestampReadable: new Date().toLocaleString(),
      id: crypto.randomUUID()
    };
    db.data.ratings.push(newRating);
    await db.write();
    return newRating;
  });

  ipcMain.handle('get-ratings-by-date', async (event, dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

    logger.info(`Fetching ratings for ${dateStr}: ${dayStart} to ${dayEnd}`);
    logger.info(`Total ratings in DB: ${db.data.ratings.length}`);

    const dayRatings = db.data.ratings.filter((r: any) => {
      const inRange = r.timestamp >= dayStart && r.timestamp <= dayEnd;
      return inRange;
    });

    logger.info(`Found ${dayRatings.length} ratings for ${dateStr}`);
    return dayRatings;
  });

  // Get activity data for a specific date (includes goals and activities from that day)
  ipcMain.handle('get-activity-data-by-date', async (event, dateStr: string) => {
    try {
      const activityFilePath = path.join(app.getPath('userData'), 'activity_logs', `activity-${dateStr}.json`);
      logger.info(`[get-activity-data-by-date] Looking for file: ${activityFilePath}`);

      const fs = await import('node:fs/promises');

      try {
        await fs.access(activityFilePath);
      } catch {
        logger.info(`[get-activity-data-by-date] No activity file for ${dateStr}`);
        return { goals: [], activities: [], exists: false };
      }

      const { Low } = await import('lowdb');
      const { JSONFile } = await import('lowdb/node');

      const adapter = new JSONFile(activityFilePath);
      const dateDb = new Low(adapter, { activities: [], goals: [] });
      await dateDb.read();
      const data = dateDb.data as any;
      logger.info(`[get-activity-data-by-date] Found ${data.goals?.length || 0} goals and ${data.activities?.length || 0} activities for ${dateStr}`);

      return {
        goals: data.goals || [],
        activities: data.activities || [],
        exists: true
      };
    } catch (e) {
      logger.error(`[get-activity-data-by-date] Error:`, e);
      return { goals: [], activities: [], exists: false };
    }
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

  // Auto-launch (startup) handlers
  ipcMain.handle('get-auto-launch', () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    logger.info(`Auto-launch set to: ${enabled}`);
    return enabled;
  });

  // Update checker — compares package.json version against latest GitHub release
  ipcMain.handle('check-for-updates', async () => {
    const currentVersion = app.getVersion();
    try {
      const response = await net.fetch('https://api.github.com/repos/Heisen47/produchive/releases/latest', {
        headers: { 'User-Agent': 'produchive-app' }
      });

      if (!response.ok) {
        logger.warn(`GitHub API returned ${response.status}`);
        return { updateAvailable: false, currentVersion };
      }

      const data = await response.json() as any;
      const latestVersion = (data.tag_name || '').replace(/^v/, '');
      const releaseUrl = data.html_url || 'https://github.com/Heisen47/produchive/releases';

      // Simple semver comparison: split by dots and compare numerically
      const current = currentVersion.split('.').map(Number);
      const latest = latestVersion.split('.').map(Number);
      let updateAvailable = false;
      for (let i = 0; i < 3; i++) {
        if ((latest[i] || 0) > (current[i] || 0)) { updateAvailable = true; break; }
        if ((latest[i] || 0) < (current[i] || 0)) break;
      }

      logger.info(`Update check: current=${currentVersion}, latest=${latestVersion}, updateAvailable=${updateAvailable}`);
      return { updateAvailable, latestVersion, currentVersion, releaseUrl };
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return { updateAvailable: false, currentVersion };
    }
  });

  logger.info('All IPC handlers registered successfully');
}

app.on('ready', async () => {
  logger.info('=== Produchive Starting ===');
  try {
    registerIpcHandlers();

    // 2. Initialize DB
    await initDB();

    // 3. Mark app as ready and create window
    isAppReady = true;
    createWindow();

    // 4. Create system tray
    const iconPath = (() => {
      if (process.platform === 'win32') {
        return app.isPackaged
          ? path.join(process.resourcesPath, 'icon.ico')
          : path.join(__dirname, '../../resources/icon.ico');
      } else {
        return app.isPackaged
          ? path.join(process.resourcesPath, 'icon.png')
          : path.join(__dirname, '../../resources/icon.png');
      }
    })();

    tray = new Tray(iconPath);
    tray.setToolTip('Produchive - Productivity Tracker');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Produchive',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Start Monitoring',
        click: async () => {
          await startMonitoring();
        }
      },
      {
        label: 'Stop Monitoring',
        click: () => {
          stopMonitoring();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });

  } catch (error) {
    logger.error('Error during app initialization:', error);
    dialog.showErrorBox('Startup Error', 'Critical error during starting up: ' + String(error));
  }
});

// Keep app running in tray when all windows are closed
app.on('window-all-closed', () => {
  logger.info('All windows closed - running in tray');

});

app.on('activate', () => {
  logger.info('App activated');
  if (isAppReady && BrowserWindow.getAllWindows().length === 0) {
    logger.info('No windows open, creating new window');
    createWindow();
  } else if (!isAppReady) {
    logger.info('App activated but not yet ready/initialized. Waiting...');
  }
});

app.on('will-quit', () => {
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Uncaught Exception', error.message + '\n' + error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  dialog.showErrorBox('Unhandled Rejection', String(reason));
});