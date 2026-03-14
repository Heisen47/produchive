import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  systemPreferences,
  Tray,
  Menu,
  nativeImage,
  net,
} from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { createLogger, getLogPath } from "./lib/logger";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { execSync, exec } from "node:child_process";
import { getAutoUpdater } from "./lib/autoUpdater";

const logger = createLogger("Main");

if (started) {
  app.quit();
}

// Enforce single instance — if another instance launches, focus the existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    // Someone tried to open a second instance — focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.commandLine.appendSwitch("disable-gpu-watchdog");
app.commandLine.appendSwitch("force_high_performance_gpu");
let db: any = { data: { tasks: [], goals: [], ratings: [] } };
let dbFilePath: string;

// Daily Activity DB
let activityDb: any;
let currentActivityDate: string = "";
let isAppReady = false;

async function getActivityDb() {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // If we already have a DB for today, return it
  if (activityDb && currentActivityDate === today) {
    return activityDb;
  }

  // Initialize new daily DB
  const { Low } = await import("lowdb");
  const { JSONFile } = await import("lowdb/node");
  const fs = await import("node:fs/promises");

  const logsDir = path.join(app.getPath("userData"), "activity_logs");

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

  // Streak Logic: If streak is missing for today, calculate it from yesterday
  if (typeof activityDb.data.streak === "undefined") {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdayFilePath = path.join(
        logsDir,
        `activity-${yesterdayStr}.json`,
      );

      await fs.access(yesterdayFilePath); // Check if yesterday's file exists

      // Read yesterday's file manually to get the streak
      const yesterdayAdapter = new JSONFile(yesterdayFilePath);
      const yesterdayDb = new Low(yesterdayAdapter, { streak: 0 });
      await yesterdayDb.read();

      const prevStreak = (yesterdayDb.data as any)?.streak || 0;
      activityDb.data.streak = prevStreak + 1;
      logger.info(`[Streak] Incrementing streak to ${activityDb.data.streak}`);
    } catch (e) {
      // Yesterday's file doesn't exist or error reading it -> Streak broken/reset
      activityDb.data.streak = 1;
      logger.info(
        `[Streak] No activity yesterday (or error), resetting streak to 1`,
      );
    }
    await activityDb.write();
  }

  await activityDb.write();

  currentActivityDate = today;
  return activityDb;
}

async function initDB() {
  logger.info("Initializing main database...");
  try {
    const { Low } = await import("lowdb");
    const { JSONFile } = await import("lowdb/node");

    dbFilePath = path.join(app.getPath("userData"), "db.json");
    logger.info(`Database file location: ${dbFilePath}`);

    const adapter = new JSONFile(dbFilePath);
    db = new Low(adapter, { tasks: [], goals: [], ratings: [], settings: {} });
    await db.read();
    db.data ||= { tasks: [], goals: [], ratings: [], settings: {} };
    // Ensure settings object exists (migration)
    db.data.settings ||= {};
    // Migration for old "goal" property if needed
    if (!db.data.goals && (db.data as any).goal) {
      db.data.goals = [(db.data as any).goal];
    }
    db.data.goals ||= [];
    db.data.ratings ||= [];

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

    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize database:", error);
    dialog.showErrorBox(
      "Database Initialization Error",
      `Failed to load database: ${error instanceof Error ? error.message : String(error)}`,
    );
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
    show: false, // Don't show until content is painted
    backgroundColor: "#0a0e1a", // Match dark theme bg to prevent white flash
    autoHideMenuBar: true, // Hide default menu bar (File, Edit, etc)
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      partition: "persist:main",
      backgroundThrottling: false, // Prevent renderer suspension when hidden
    },
    icon: (() => {
      if (process.platform === "darwin") {
        return app.isPackaged
          ? path.join(process.resourcesPath, "icon.icns")
          : path.join(__dirname, "../../resources/icon.icns");
      } else if (process.platform === "win32") {
        return app.isPackaged
          ? path.join(process.resourcesPath, "icon.ico")
          : path.join(__dirname, "../../resources/icon.ico");
      } else {
        return app.isPackaged
          ? path.join(process.resourcesPath, "icon.png")
          : path.join(__dirname, "../../resources/icon.png");
      }
    })(),
  });

  // Show window only after content is fully painted
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
    );
    mainWindow.loadFile(indexPath);
  }

  // Open the DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  if (process.platform === "darwin") {
    app.dock.setIcon(
      app.isPackaged
        ? path.join(process.resourcesPath, "icon.png")
        : path.join(__dirname, "../../resources/icon.png"),
    );
  }

  // Minimize to tray instead of closing
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  // When restoring from tray, ensure content is visible before showing
  mainWindow.on("show", () => {
    mainWindow?.webContents.invalidate(); // Force repaint
  });
};

let monitoringInterval: NodeJS.Timeout | null = null;
let lastActivity: any = null;

const blockedActivities = new Map<string, any>();
let blockEnforcementInterval: NodeJS.Timeout | null = null;

function execAsync(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(script, (error, stdout, stderr) => {
      if (error) {
        logger.error(`[BlockMode] Script error: ${error.message}`, stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

let psProc: any = null;
function getPowerShell() {
  if (psProc) return psProc;
  const { spawn } = require("child_process");
  psProc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "-"]);
  
  psProc.stdin.write(`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@
`);
  psProc.on('error', (err: any) => logger.error('[BlockMode] PowerShell error:', err));
  return psProc;
}

async function applyBlockMode(activity: any, block: boolean) {
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";
  if (!isMac && !isWin) return;

  let appName = activity.owner.name;

  if (isMac) {
    if (appName === "Chrome") appName = "Google Chrome";
    if (appName === "Brave") appName = "Brave Browser";
    if (appName === "Edge") appName = "Microsoft Edge";
  }

  logger.info(
    `[BlockMode] ${block ? "BLOCK" : "UNBLOCK"} "${appName}"`
  );

  try {
    if (isMac) {
      if (block) {
        // Two-step hide: set visible to false AND push to back
        const script = `osascript -e '
          tell application "System Events"
            if exists process "${appName}" then
              set visible of process "${appName}" to false
              set frontmost of process "${appName}" to false
            end if
          end tell'`;
        await execAsync(script);
        logger.info(`[BlockMode] Successfully hidden: ${appName}`);
      } else {
        const script = `osascript -e '
          tell application "System Events"
            if exists process "${appName}" then
              set visible of process "${appName}" to true
            end if
          end tell'`;
        await execAsync(script);
        logger.info(`[BlockMode] Successfully shown: ${appName}`);
      }
    } else if (isWin) {
      const ps = getPowerShell();
      // On Windows, extracting process name from path is infinitely more reliable than trusting Description fields
      let exeName = appName;
      if (activity.owner.path) {
        exeName = path.basename(activity.owner.path, ".exe");
      }
      const safeExeName = exeName.replace(/'/g, "''");
      const cmd = block ? 6 : 9; // 6 = SW_MINIMIZE, 9 = SW_RESTORE
      
      const scriptItem = `
$procs = Get-Process -Name '${safeExeName}' -ErrorAction SilentlyContinue
if (-not $procs) {
  $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Description -match [regex]::Escape('${safeExeName}') }
}
if ($procs) {
  foreach ($p in $procs) {
    if ($p.MainWindowHandle -ne 0) {
      [Win]::ShowWindow($p.MainWindowHandle, ${cmd})
    }
  }
}
`;
      ps.stdin.write(scriptItem + "\n");
    }
  } catch (e: any) {
    logger.error(`[BlockMode] Failed to ${block ? "hide" : "show"} ${appName}:`, e.message);
  }
}

// Fast enforcement loop — re-hides blocked apps every 200ms so they can't briefly appear
function startBlockEnforcement() {
  if (blockEnforcementInterval) return; // already running
  logger.info("[BlockMode] Starting fast enforcement loop (200ms)");
  blockEnforcementInterval = setInterval(() => {
    for (const activity of blockedActivities.values()) {
      applyBlockMode(activity, true);
    }
  }, 200);
}

function stopBlockEnforcement() {
  if (blockEnforcementInterval) {
    clearInterval(blockEnforcementInterval);
    blockEnforcementInterval = null;
    logger.info("[BlockMode] Stopped fast enforcement loop");
  }
}

function updateBlockEnforcement() {
  if (blockedActivities.size > 0) {
    startBlockEnforcement();
  } else {
    stopBlockEnforcement();
  }
}

const stopMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    logger.info("Monitoring stopped");
  }
};

const checkMacPermissions = () => {
  if (process.platform !== "darwin") return true;

  // Check accessibility WITHOUT prompting system dialog (false = don't prompt)
  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);
  if (!isTrusted) {
    // Now prompt the system dialog by calling with true
    systemPreferences.isTrustedAccessibilityClient(true);
    dialog.showErrorBox(
      "Accessibility Permission Required",
      "Produchive needs Accessibility permissions to monitor active windows.\n\n" +
        "Please enable it in System Settings > Privacy & Security > Accessibility.\n\n" +
        "After enabling, you may need to restart the app.",
    );
    return false;
  }

  const screenAccess = systemPreferences.getMediaAccessStatus("screen");
  if (screenAccess === "denied" || screenAccess === "not-determined") {
    logger.info(`Screen Recording permission status: ${screenAccess}`);
  }

  return true;
};

const startMonitoring = async (): Promise<boolean> => {
  if (monitoringInterval) {
    logger.info("Monitoring already running");
    return true;
  }

  if (!checkMacPermissions()) {
    return false;
  }

  if (!mainWindow) {
    logger.error("Cannot start monitoring: No main window");
    return false;
  }

  logger.info("Starting activity monitoring...");
  try {
    let activeWin;
    if (app.isPackaged) {
      const activeWinPath = path.join(process.resourcesPath, "active-win");
      activeWin = require(activeWinPath);
    } else {
      activeWin = require("active-win");
    }

    // Test run to ensure it works immediately
    try {
      const testResult = await activeWin();
      logger.info(
        "Active-win test successful:",
        testResult ? "got window data" : "null result",
      );
    } catch (initialError: any) {
      logger.error("Active-win test failed:", {
        message: initialError?.message,
        stderr: initialError?.stderr,
        stdout: initialError?.stdout,
        code: initialError?.code,
      });
      throw initialError; // Throw so we land in the outer catch block
    }

    monitoringInterval = setInterval(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) {
        logger.warn("Main window destroyed, stopping monitoring");
        stopMonitoring();
        return;
      }

      try {
        const result = await activeWin();
        if (result) {
          // ... (same logic as before)
          const appName = result.owner.name.toLowerCase();
          if (appName.includes("produchive") || appName.includes("electron")) {
            return;
          }

          const browsers = [
            "Google Chrome",
            "Chrome",
            "Brave",
            "Safari",
            "Firefox",
            "Microsoft Edge",
          ];
          if (
            browsers.some((b) => result.owner.name.includes(b)) &&
            result.title.toLowerCase().includes("leetcode")
          ) {
            result.title = "LeetCode";
          }

          // Enforce blocking if this app is blocked
          if (blockedActivities.has(result.owner.name)) {
            applyBlockMode(result, true);
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
            duration: 0,
          };

          if (
            !lastActivity ||
            lastActivity.owner.name !== activity.owner.name
          ) {
            mainWindow.webContents.send("system-event", {
              type: "SYS_PROCESS_SWITCH",
              content: `Process Context Switch: ${lastActivity?.owner?.name || "init"} -> ${activity.owner.name}`,
              timestamp,
              details: { pid: result.owner.processId, path: result.owner.path },
            });
          }

          if (!lastActivity || lastActivity.title !== activity.title) {
            mainWindow.webContents.send("system-event", {
              type: "SYS_WINDOW_FOCUS",
              content: `Window Focus Change: "${activity.title}"`,
              timestamp,
            });
          }

          const currentDb = await getActivityDb();
          const existingActivity = currentDb.data.activities.find(
            (a: any) =>
              a.title === activity.title &&
              a.owner.name === activity.owner.name,
          );

          if (existingActivity) {
            if (typeof existingActivity.duration !== "number")
              existingActivity.duration = 0;
            existingActivity.duration += 1000;

            activity.duration = existingActivity.duration;
            activity.timestamp = existingActivity.timestamp;

            // Backfill readable timestamp if missing
            if (!existingActivity.timestampReadable) {
              existingActivity.timestampReadable = new Date(
                existingActivity.timestamp,
              ).toLocaleString();
            }
            activity.timestampReadable = existingActivity.timestampReadable;

            if (timestamp % 10000 < 1500) {
              currentDb.write().catch((e: any) => {});
            }
          } else {
            activity.duration = 1000;
            currentDb.data.activities.push(activity);
            currentDb
              .write()
              .catch((e: any) =>
                logger.error("Failed to write activity to DB:", e),
              );
          }

          lastActivity = activity;
          mainWindow.webContents.send("activity-update", activity);
        }
      } catch (error) {
        logger.error("Error getting active window:", error);
        stopMonitoring();

        let errorMessage = "Failed to access active window.";
        if (process.platform === "linux") {
          errorMessage +=
            "\n\nLinux Note: Ensure you have 'xprop' installed. If you are on Wayland, switch to X11/Xorg as Wayland blocks activity monitoring by design.";
        }
        dialog.showErrorBox(
          "Activity Monitoring Failed",
          errorMessage + "\n\nDetails: " + String(error),
        );
      }
    }, 1000);

    logger.info("Activity monitoring started");
    return true;
  } catch (e: any) {
    logger.error("Failed to start monitoring:", e);
    const errorMessage = e?.message || String(e);
    const stderr = e?.stderr || "";

    // Only show permission error if stderr explicitly mentions it
    const isScreenRecordingError =
      process.platform === "darwin" &&
      (stderr.includes("screen recording") ||
        errorMessage.includes("active-win/main")); // Binary failed = likely permission issue

    if (isScreenRecordingError) {
      dialog.showErrorBox(
        "Screen Recording Permission Required",
        "Produchive needs Screen Recording permission to monitor active windows.\n\n" +
          "Please:\n" +
          "1. Open System Settings → Privacy & Security → Screen Recording\n" +
          "2. Enable the toggle for 'produchive'\n" +
          "3. Quit and restart this app (Cmd+Q, then reopen)\n\n" +
          "The permission won't take effect until you restart.",
      );
    } else {
      // Show the actual error for debugging
      dialog.showErrorBox(
        "Monitoring Error",
        "Failed to start monitoring.\n\n" +
          "Error: " +
          errorMessage +
          "\n\n" +
          (stderr ? "Details: " + stderr : ""),
      );
    }
    return false;
  }
};

function registerIpcHandlers() {
  // Blocking handlers
  ipcMain.handle("get-blocked-activities", () => {
    return Array.from(blockedActivities.values());
  });

  ipcMain.handle("block-activity", async (event, activity) => {
    const key = activity.owner.name;
    blockedActivities.set(key, activity);
    await applyBlockMode(activity, true);
    updateBlockEnforcement();
    logger.info(`[BlockMode] Blocked app: ${key}. Total blocked: ${blockedActivities.size}`);
    return Array.from(blockedActivities.values());
  });

  ipcMain.handle("unblock-activity", async (event, activity) => {
    const key = activity.owner.name;
    blockedActivities.delete(key);
    updateBlockEnforcement(); // Stop loop first if no more blocked apps
    await applyBlockMode(activity, false);
    logger.info(`[BlockMode] Unblocked app: ${key}. Total blocked: ${blockedActivities.size}`);
    return Array.from(blockedActivities.values());
  });

  // Task management handlers
  ipcMain.handle("get-tasks", async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const activityFilePath = path.join(
        app.getPath("userData"),
        "activity_logs",
        `activity-${today}.json`,
      );

      logger.info("========================================");
      logger.info("[get-tasks] Loading data for frontend");
      logger.info(`[get-tasks] Activity file: ${activityFilePath}`);
      logger.info(`[get-tasks] Main DB file: ${dbFilePath}`);

      const currentActivityDb = await getActivityDb();

      const todaysGoals = currentActivityDb?.data?.goals || [];

      logger.info(`[get-tasks] Goals loaded (today): ${todaysGoals.length}`);
      logger.info(
        `[get-tasks] Activities loaded: ${currentActivityDb?.data?.activities?.length || 0}`,
      );
      logger.info(
        `[get-tasks] Ratings loaded: ${db.data.ratings?.length || 0}`,
      );
      logger.info("========================================");

      return {
        tasks: db.data.tasks,
        goals: todaysGoals,
        activities: currentActivityDb?.data?.activities || [],
        ratings: db.data.ratings || [],
        stats: { streak: currentActivityDb?.data?.streak || 1 },
      };
    } catch (e) {
      logger.error("Failed in get-tasks", e);
      dialog.showErrorBox(
        "Data Loading Error",
        "Failed to retrieve tasks and activities. " + String(e),
      );
      return { tasks: [], goals: [], activities: [], ratings: [] };
    }
  });

  ipcMain.handle("add-task", async (event, task) => {
    db.data.tasks.push(task);
    await db.write();
    return db.data.tasks;
  });

  ipcMain.handle("update-task", async (event, updatedTask) => {
    const index = db.data.tasks.findIndex((t: any) => t.id === updatedTask.id);
    if (index !== -1) {
      db.data.tasks[index] = updatedTask;
      await db.write();
    }
    return db.data.tasks;
  });

  ipcMain.handle("delete-task", async (event, id) => {
    db.data.tasks = db.data.tasks.filter((t: any) => t.id !== id);
    await db.write();
    return db.data.tasks;
  });

  ipcMain.handle("save-goals", async (event, goals) => {
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

  ipcMain.handle("save-rating", async (event, rating) => {
    const newRating = {
      ...rating,
      timestamp: Date.now(),
      timestampReadable: new Date().toLocaleString(),
      id: crypto.randomUUID(),
    };
    db.data.ratings.push(newRating);
    await db.write();
    return newRating;
  });

  ipcMain.handle("get-ratings-by-date", async (event, dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
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
  ipcMain.handle(
    "get-activity-data-by-date",
    async (event, dateStr: string) => {
      try {
        const activityFilePath = path.join(
          app.getPath("userData"),
          "activity_logs",
          `activity-${dateStr}.json`,
        );
        logger.info(
          `[get-activity-data-by-date] Looking for file: ${activityFilePath}`,
        );

        const fs = await import("node:fs/promises");

        try {
          await fs.access(activityFilePath);
        } catch {
          logger.info(
            `[get-activity-data-by-date] No activity file for ${dateStr}`,
          );
          return { goals: [], activities: [], exists: false };
        }

        const { Low } = await import("lowdb");
        const { JSONFile } = await import("lowdb/node");

        const adapter = new JSONFile(activityFilePath);
        const dateDb = new Low(adapter, { activities: [], goals: [] });
        await dateDb.read();
        const data = dateDb.data as any;
        logger.info(
          `[get-activity-data-by-date] Found ${data.goals?.length || 0} goals and ${data.activities?.length || 0} activities for ${dateStr}`,
        );

        return {
          goals: data.goals || [],
          activities: data.activities || [],
          exists: true,
        };
      } catch (e) {
        logger.error(`[get-activity-data-by-date] Error:`, e);
        return { goals: [], activities: [], exists: false };
      }
    },
  );

  // Get activity data for a range of dates (for charts)
  ipcMain.handle(
    "get-activity-data-range",
    async (event, startDate: string, endDate: string) => {
      try {
        const fs = await import("node:fs/promises");
        const { Low } = await import("lowdb");
        const { JSONFile } = await import("lowdb/node");
        const logsDir = path.join(app.getPath("userData"), "activity_logs");

        const result: Record<string, { activities: any[] }> = {};
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split("T")[0];
          const filePath = path.join(logsDir, `activity-${dateStr}.json`);

          try {
            await fs.access(filePath);
            const adapter = new JSONFile(filePath);
            const dateDb = new Low(adapter, { activities: [], goals: [] });
            await dateDb.read();
            const data = dateDb.data as any;
            result[dateStr] = { activities: data.activities || [] };
          } catch {
            result[dateStr] = { activities: [] };
          }
        }

        logger.info(
          `[get-activity-data-range] Fetched ${Object.keys(result).length} days from ${startDate} to ${endDate}`,
        );
        return result;
      } catch (e) {
        logger.error(`[get-activity-data-range] Error:`, e);
        return {};
      }
    },
  );

  // Debug and system info handlers
  ipcMain.handle("get-system-info", async () => {
    let distro = "unknown";
    if (process.platform === "linux") {
      try {
        const osRelease = await fs.readFile("/etc/os-release", "utf-8");
        const lines = osRelease.split("\n");
        const idLine = lines.find((line) => line.startsWith("ID="));
        const idLikeLine = lines.find((line) => line.startsWith("ID_LIKE="));

        if (idLine) {
          distro = idLine.split("=")[1].replace(/"/g, "").toLowerCase();
        }
        if (distro === "unknown" && idLikeLine) {
          distro = idLikeLine.split("=")[1].replace(/"/g, "").toLowerCase();
        }
      } catch (e) {
        logger.error("Failed to read os-release", e);
      }
    }

    return {
      userDataPath: app.getPath("userData"),
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
      distro,
    };
  });

  ipcMain.handle("open-user-data-folder", () => {
    const userDataPath = app.getPath("userData");
    shell.openPath(userDataPath);
    return userDataPath;
  });

  ipcMain.handle("open-log-file", () => {
    const logPath = getLogPath();
    shell.openPath(path.dirname(logPath));
    return logPath;
  });

  ipcMain.handle("get-db-contents", async () => {
    const currentActivityDb = await getActivityDb();
    return {
      tasks: db.data.tasks,
      activities: currentActivityDb?.data?.activities || [],
      goals: db.data.goals || [],
    };
  });

  ipcMain.handle("start-monitoring", async () => {
    return await startMonitoring();
  });

  ipcMain.handle("stop-monitoring", () => {
    stopMonitoring();
  });

  // Auto-launch (startup) handlers
  ipcMain.handle("get-auto-launch", () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle("set-auto-launch", (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    logger.info(`Auto-launch set to: ${enabled}`);
    return enabled;
  });

  // ─── Custom GitHub Releases Auto-Updater ───────────────────────────────
  // Replaces update-electron-app with in-app download + restart flow
  const updater = getAutoUpdater();

  ipcMain.handle("check-for-updates", async () => {
    return await updater.checkForUpdate();
  });

  ipcMain.handle("download-update", async () => {
    const filePath = await updater.downloadUpdate();
    return { success: !!filePath, filePath };
  });

  ipcMain.handle("install-update", async () => {
    // IMPORTANT: Set isQuitting so the mainWindow 'close' handler
    // doesn't trap the quit and hide the window instead of closing.
    isQuitting = true;
    await updater.applyUpdateAndRestart();
  });

  // App settings (persisted in DB)
  ipcMain.handle("get-settings", async () => {
    return db.data.settings || {};
  });

  ipcMain.handle("set-setting", async (_event, key: string, value: any) => {
    db.data.settings ||= {};
    db.data.settings[key] = value;
    await db.write();
    logger.info(`Setting updated: ${key} = ${JSON.stringify(value)}`);
    return db.data.settings;
  });

  logger.info("All IPC handlers registered successfully");
}

app.on("ready", async () => {
  logger.info("=== Produchive Starting ===");
  try {
    registerIpcHandlers();

    // 2. Initialize DB
    await initDB();

    // 3. Mark app as ready and create window
    isAppReady = true;
    createWindow();

    // 3b. Initialize auto-updater with the main window
    if (mainWindow) {
      const updater = getAutoUpdater();
      updater.setMainWindow(mainWindow);
      updater.startPeriodicChecks();
    }

    // 4. Create system tray
    let trayIcon: Electron.NativeImage;

    if (process.platform === "darwin") {
      // Use dedicated monochrome "P" tray icon for macOS menu bar
      // The 'Template' suffix tells macOS to automatically tint for light/dark mode
      const trayIconPath = app.isPackaged
        ? path.join(process.resourcesPath, "trayIconTemplate.png")
        : path.join(__dirname, "../../resources/trayIconTemplate.png");
      trayIcon = nativeImage.createFromPath(trayIconPath);
      trayIcon.setTemplateImage(true);
    } else {
      const iconPath =
        process.platform === "win32"
          ? app.isPackaged
            ? path.join(process.resourcesPath, "icon.ico")
            : path.join(__dirname, "../../resources/icon.ico")
          : app.isPackaged
            ? path.join(process.resourcesPath, "icon.png")
            : path.join(__dirname, "../../resources/icon.png");
      trayIcon = nativeImage.createFromPath(iconPath);
    }
    tray = new Tray(trayIcon);
    tray.setToolTip("Produchive - Productivity Tracker");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show Produchive",
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      { type: "separator" },
      {
        label: "Start Monitoring",
        click: async () => {
          await startMonitoring();
        },
      },
      {
        label: "Stop Monitoring",
        click: () => {
          stopMonitoring();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on("double-click", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });

    // 5. Set Application Menu
    const isMac = process.platform === 'darwin';
    const menuTemplate: any[] = [
      ...(isMac ? [{
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { label: 'Check for Updates...', click: () => { getAutoUpdater().checkForUpdate(); } },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }] : []),
      {
        label: 'File',
        submenu: [
          isMac ? { role: 'close' } : { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ] : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          ...(isMac ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' }
          ] : [
            { role: 'close' }
          ])
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'Learn More',
            click: async () => {
              const { shell } = require('electron');
              await shell.openExternal('https://github.com/Heisen47/produchive');
            }
          },
          ...(!isMac ? [
            { type: 'separator' },
            { label: 'Check for Updates...', click: () => { getAutoUpdater().checkForUpdate(); } }
          ] : [])
        ]
      }
    ];

    const applicationMenu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(applicationMenu);

  } catch (error) {
    logger.error("Error during app initialization:", error);
    dialog.showErrorBox(
      "Startup Error",
      "Critical error during starting up: " + String(error),
    );
  }
});

// Keep app running in tray when all windows are closed
app.on("window-all-closed", () => {
  logger.info("All windows closed - running in tray");
});

app.on("activate", () => {
  logger.info("App activated");
  if (isAppReady && BrowserWindow.getAllWindows().length === 0) {
    logger.info("No windows open, creating new window");
    createWindow();
  } else if (!isAppReady) {
    logger.info("App activated but not yet ready/initialized. Waiting...");
  }
});

app.on("before-quit", () => {
  logger.info("Restoring blocked activities before quit...");
  stopBlockEnforcement();
  for (const activity of blockedActivities.values()) {
    try {
      let appName = activity.owner.name;
      if (process.platform === "darwin") {
        if (appName === "Chrome") appName = "Google Chrome";
        if (appName === "Brave") appName = "Brave Browser";
        if (appName === "Edge") appName = "Microsoft Edge";
        const script = `osascript -e 'tell application "System Events" to set visible of process "${appName}" to true'`;
        execSync(script);
        logger.info(`[BlockMode] Restored on quit: ${appName}`);
      } else if (process.platform === "win32") {
        const safeAppName = appName.replace(/'/g, "''");
        const script = `Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class Win { [DllImport(\\"user32.dll\\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); }"; $p = Get-Process -Name '${safeAppName}' -ErrorAction SilentlyContinue; if (-not $p) { $p = Get-Process -ErrorAction SilentlyContinue | ? { $_.Description -match '${safeAppName}' } }; if ($p) { foreach ($x in $p) { if ($x.MainWindowHandle -ne 0) { [Win]::ShowWindow($x.MainWindowHandle, 9) } } }`;
        execSync(`powershell.exe -WindowStyle Hidden -NoProfile -NonInteractive -Command "${script}"`);
        logger.info(`[BlockMode] Restored on quit: ${appName}`);
      }
    } catch(e) {
      // Best effort — don't block quit
    }
  }
  blockedActivities.clear();
  if (psProc) {
    psProc.stdin.end();
    psProc.kill();
    psProc = null;
  }
});

app.on("will-quit", () => {});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  dialog.showErrorBox("Uncaught Exception", error.message + "\n" + error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  dialog.showErrorBox("Unhandled Rejection", String(reason));
});
