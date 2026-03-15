/**
 * Custom GitHub Releases Auto-Updater for Electron Forge apps.
 *
 * Electron's built-in autoUpdater (Squirrel) requires code-signed installers.
 * Since Produchive distributes unsigned ZIPs/DMGs via GitHub Releases,
 * we implement a custom updater that:
 *
 *  1. Checks the GitHub Releases API for the latest version
 *  2. Compares semver with the running version
 *  3. Downloads the correct platform asset directly (with progress)
 *  4. Extracts / stages the new binary
 *  5. Prompts the user to restart
 *  6. Replaces the old app and relaunches
 */

import { app, BrowserWindow, net, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { createWriteStream } from "node:fs";
import https from "node:https";
import http from "node:http";
import { execSync, spawn } from "node:child_process";
import { createLogger } from "./logger";
import { compareSemver, findAssetForPlatform } from "./updaterUtils";

// Re-export pure utils so external code can import from either module
export { compareSemver, findAssetForPlatform } from "./updaterUtils";

const logger = createLogger("AutoUpdater");

// ─── Configuration ────────────────────────────────────────────────────────────
const GITHUB_REPO = "Heisen47/produchive";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  assetName?: string;
  assetSize?: number;
}

export interface DownloadProgress {
  percent: number; // 0-100
  transferred: number; // bytes
  total: number; // bytes
}

export type UpdateStatus =
  | { status: "checking" }
  | { status: "available"; version: string; releaseNotes?: string }
  | { status: "not-available"; currentVersion: string }
  | { status: "downloading"; progress: DownloadProgress }
  | { status: "downloaded"; version: string }
  | { status: "error"; message: string };

// Pure utility functions (compareSemver, findAssetForPlatform, etc.) are in updaterUtils.ts
// and re-exported above for convenience.

// ─── Core Updater Class ──────────────────────────────────────────────────────

export class GitHubAutoUpdater {
  private mainWindow: BrowserWindow | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private downloadedFilePath: string | null = null;
  private latestUpdateInfo: UpdateInfo | null = null;
  /** Version that was already downloaded/installed — cached in memory */
  private handledVersion: string | null = null;

  /** Path to the file that persists the last-updated version across restarts */
  private get versionFilePath(): string {
    return path.join(app.getPath("userData"), ".last-update-version");
  }

  /**
   * Read the persisted "already handled" version from disk.
   * Returns null if the file doesn't exist or can't be read.
   */
  private async readPersistedVersion(): Promise<string | null> {
    try {
      const raw = await fsPromises.readFile(this.versionFilePath, "utf-8");
      return raw.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Write the version to disk so the app remembers it after restart.
   */
  private async persistVersion(version: string): Promise<void> {
    try {
      await fsPromises.writeFile(this.versionFilePath, version, "utf-8");
      logger.info(`[AutoUpdater] Persisted handled version: ${version}`);
    } catch (err) {
      logger.warn("[AutoUpdater] Could not persist version:", err);
    }
  }

  /** Attach to the main window so we can send status events */
  setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  /** Send status to renderer via IPC */
  private sendStatus(status: UpdateStatus) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send("update-status", status);
    }
    logger.info(`[AutoUpdater] Status: ${JSON.stringify(status)}`);
  }

  /** Start periodic update checks (call once on app ready) */
  startPeriodicChecks() {
    // Check immediately on start (after a short delay for the window to load)
    setTimeout(() => this.checkForUpdate(), 10_000);

    // Then check on interval
    this.checkTimer = setInterval(
      () => this.checkForUpdate(),
      CHECK_INTERVAL_MS,
    );
  }

  /** Stop periodic checks */
  stopPeriodicChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /** Manually trigger an update check — returns the info */
  async checkForUpdate(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();
    this.sendStatus({ status: "checking" });

    try {
      const releaseData = await this.fetchLatestRelease();

      if (!releaseData || !releaseData.tag_name) {
        this.sendStatus({ status: "not-available", currentVersion });
        return {
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
        };
      }

      const latestVersion = releaseData.tag_name.replace(/^v/, "");

      // Load the persisted "already handled" version if we haven't yet
      if (!this.handledVersion) {
        this.handledVersion = await this.readPersistedVersion();
      }

      // Not newer than the running version → up to date
      if (compareSemver(latestVersion, currentVersion) <= 0) {
        logger.info(`[AutoUpdater] Up to date (${currentVersion})`);
        // Clean up the persisted file — we're already on this version
        this.handledVersion = null;
        fsPromises.unlink(this.versionFilePath).catch(() => {});
        this.sendStatus({ status: "not-available", currentVersion });
        return { currentVersion, latestVersion, updateAvailable: false };
      }

      // Already downloaded / installed this exact version → don't nag again
      if (this.handledVersion && compareSemver(latestVersion, this.handledVersion) <= 0) {
        logger.info(
          `[AutoUpdater] Latest ${latestVersion} already handled (persisted: ${this.handledVersion}). ` +
          `Skipping banner.`,
        );
        this.sendStatus({ status: "not-available", currentVersion });
        return { currentVersion, latestVersion, updateAvailable: false };
      }

      // There IS a newer version
      const asset = findAssetForPlatform(releaseData.assets || []);
      const info: UpdateInfo = {
        currentVersion,
        latestVersion,
        updateAvailable: true,
        releaseNotes: releaseData.body || "",
        releaseUrl: releaseData.html_url,
        downloadUrl: asset?.url,
        assetName: asset?.name,
        assetSize: asset?.size,
      };

      this.latestUpdateInfo = info;

      if (asset) {
        this.sendStatus({
          status: "available",
          version: latestVersion,
          releaseNotes: info.releaseNotes,
        });
      } else {
        // No matching asset for this platform — can't auto-download
        logger.warn(
          `[AutoUpdater] No asset matched for platform: ${process.platform}-${process.arch}`,
        );
        this.sendStatus({
          status: "available",
          version: latestVersion,
          releaseNotes: info.releaseNotes,
        });
      }

      return info;
    } catch (err: any) {
      logger.error("[AutoUpdater] Check failed:", err);
      this.sendStatus({ status: "error", message: err.message || String(err) });
      return {
        currentVersion,
        latestVersion: currentVersion,
        updateAvailable: false,
      };
    }
  }

  /** Download the update asset to a temp directory with progress */
  async downloadUpdate(): Promise<string | null> {
    if (!this.latestUpdateInfo?.downloadUrl) {
      this.sendStatus({
        status: "error",
        message: "No download URL available for this platform",
      });
      return null;
    }

    const { downloadUrl, assetName, assetSize, latestVersion } =
      this.latestUpdateInfo;
    const tmpDir = path.join(app.getPath("temp"), "produchive-update");

    try {
      // Ensure temp directory
      await fsPromises.mkdir(tmpDir, { recursive: true });

      const destPath = path.join(tmpDir, assetName!);

      // Remove old download if exists
      try {
        await fsPromises.unlink(destPath);
      } catch {
        // ignore
      }

      logger.info(`[AutoUpdater] Downloading ${downloadUrl} → ${destPath}`);

      await this.downloadFileWithProgress(
        downloadUrl,
        destPath,
        assetSize || 0,
      );

      // Verify the file actually exists and has content
      const stat = await fsPromises.stat(destPath);
      if (stat.size === 0) {
        throw new Error('Downloaded file is empty (0 bytes)');
      }
      logger.info(`[AutoUpdater] Download verified: ${destPath} (${stat.size} bytes)`);

      this.downloadedFilePath = destPath;

      // Mark this version as handled so the periodic check stops showing the banner
      this.handledVersion = latestVersion;
      await this.persistVersion(latestVersion);

      this.sendStatus({ status: "downloaded", version: latestVersion });
      return destPath;
    } catch (err: any) {
      logger.error("[AutoUpdater] Download failed:", err);
      this.sendStatus({
        status: "error",
        message: `Download failed: ${err.message || err}`,
      });
      return null;
    }
  }

  /** Apply the downloaded update: extract, replace, and relaunch */
  async applyUpdateAndRestart(): Promise<void> {
    if (!this.downloadedFilePath) {
      this.sendStatus({
        status: "error",
        message: "No downloaded update to apply",
      });
      return;
    }

    const downloadedFile = this.downloadedFilePath;
    const platform = process.platform;

    try {
      if (platform === "darwin") {
        await this.applyMacUpdate(downloadedFile);
      } else if (platform === "win32") {
        await this.applyWindowsUpdate(downloadedFile);
      } else if (platform === "linux") {
        await this.applyLinuxUpdate(downloadedFile);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (err: any) {
      logger.error("[AutoUpdater] Apply failed:", err);
      this.sendStatus({
        status: "error",
        message: `Failed to apply update: ${err.message || err}`,
      });

      // Show fallback dialog with link to releases page
      if (this.latestUpdateInfo?.releaseUrl) {
        const response = dialog.showMessageBoxSync({
          type: "error",
          title: "Update Failed",
          message: `The automatic update failed: ${err.message}`,
          detail: "Would you like to download the update manually from GitHub?",
          buttons: ["Open GitHub Releases", "Cancel"],
          defaultId: 0,
        });
        if (response === 0) {
          shell.openExternal(this.latestUpdateInfo.releaseUrl);
        }
      }
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private fetchLatestRelease(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        url: API_URL,
        method: "GET",
      });

      request.setHeader("Accept", "application/vnd.github.v3+json");
      request.setHeader("User-Agent", `produchive/${app.getVersion()}`);

      let data = "";

      request.on("response", (response) => {
        if (response.statusCode === 403 || response.statusCode === 429) {
          reject(new Error("GitHub API rate limit reached. Try again later."));
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`GitHub API returned ${response.statusCode}`));
          return;
        }

        response.on("data", (chunk) => {
          data += chunk.toString();
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Failed to parse GitHub API response"));
          }
        });
        response.on("error", reject);
      });

      request.on("error", reject);
      request.end();
    });
  }

  private downloadFileWithProgress(
    url: string,
    destPath: string,
    expectedSize: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        reject(err);
      };

      const doRequest = (requestUrl: string, redirectCount: number = 0) => {
        if (redirectCount > 10) {
          fail(new Error("Too many redirects"));
          return;
        }

        logger.info(`[AutoUpdater] GET ${requestUrl} (redirect #${redirectCount})`);

        // Pick http or https module based on the URL
        const client = requestUrl.startsWith('https') ? https : http;

        const req = client.get(
          requestUrl,
          {
            headers: {
              'User-Agent': `produchive/${app.getVersion()}`,
              'Accept': 'application/octet-stream',
            },
          },
          (response) => {
            // Handle redirects manually (GitHub CDN uses 302)
            if (
              (response.statusCode === 301 ||
                response.statusCode === 302 ||
                response.statusCode === 307 ||
                response.statusCode === 308) &&
              response.headers.location
            ) {
              logger.info(`[AutoUpdater] Redirected to ${response.headers.location}`);
              response.resume(); // Drain the response body
              doRequest(response.headers.location, redirectCount + 1);
              return;
            }

            if (response.statusCode !== 200) {
              fail(new Error(`Download returned HTTP ${response.statusCode}`));
              response.resume();
              return;
            }

            const total = response.headers['content-length']
              ? parseInt(response.headers['content-length'], 10)
              : expectedSize;

            let transferred = 0;
            const writeStream = createWriteStream(destPath);

            // Handle write stream errors
            writeStream.on('error', (err) => {
              logger.error('[AutoUpdater] Write stream error:', err);
              response.destroy();
              fail(err);
            });

            response.on('data', (chunk: Buffer) => {
              writeStream.write(chunk);
              transferred += chunk.length;
              const percent =
                total > 0 ? Math.round((transferred / total) * 100) : 0;
              this.sendStatus({
                status: 'downloading',
                progress: { percent, transferred, total },
              });
            });

            response.on('end', () => {
              writeStream.end(() => {
                if (settled) return;
                settled = true;
                logger.info(`[AutoUpdater] Download complete: ${transferred} bytes written to ${destPath}`);
                resolve();
              });
            });

            response.on('error', (err) => {
              writeStream.destroy();
              fail(err);
            });
          },
        );

        req.on('error', (err) => {
          fail(err);
        });
      };

      doRequest(url);
    });
  }

  // ─── Platform-Specific Update Application ─────────────────────────────

  private async applyMacUpdate(zipPath: string): Promise<void> {
    const appBundlePath = path.dirname(
      path.dirname(path.dirname(app.getAppPath())),
    );
    // e.g. /Applications/produchive.app
    // app.getAppPath() => /Applications/produchive.app/Contents/Resources/app

    logger.info(`[AutoUpdater] macOS: Current app at ${appBundlePath}`);

    // Verify it's actually an .app bundle
    if (!appBundlePath.endsWith(".app")) {
      // We're running in dev mode or non-standard location — open the zip manually
      logger.warn(
        "[AutoUpdater] Not running from .app bundle, opening download folder",
      );
      shell.showItemInFolder(zipPath);
      return;
    }

    const extractDir = path.join(
      app.getPath("temp"),
      "produchive-update-extract",
    );

    // Clean up any previous extraction
    try {
      await fsPromises.rm(extractDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    await fsPromises.mkdir(extractDir, { recursive: true });

    // Unzip
    logger.info(`[AutoUpdater] Extracting ${zipPath} to ${extractDir}`);
    execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { timeout: 60000 });

    // Find the .app bundle in the extracted contents
    const extractedContents = await fsPromises.readdir(extractDir);
    const newAppName = extractedContents.find((f) => f.endsWith(".app"));

    if (!newAppName) {
      throw new Error("No .app bundle found in the downloaded archive");
    }

    const newAppPath = path.join(extractDir, newAppName);
    const oldAppPath = appBundlePath;
    const backupPath = oldAppPath + ".bak";

    // Create a shell script that:
    //  1. Waits for the app to quit
    //  2. Removes the old app (or renames as backup)
    //  3. Moves the new app into place
    //  4. Relaunches
    //  5. Cleans up
    const updateScript = path.join(app.getPath("temp"), "produchive-update.sh");
    await fsPromises.writeFile(
      updateScript,
      `#!/bin/bash
# Wait for the app process to exit
sleep 2

# Backup old app
if [ -d "${oldAppPath}" ]; then
  rm -rf "${backupPath}"
  mv "${oldAppPath}" "${backupPath}"
fi

# Move new app into place
mv "${newAppPath}" "${oldAppPath}"

# Remove quarantine attribute (unsigned app)
xattr -rd com.apple.quarantine "${oldAppPath}" 2>/dev/null

# Re-sign the app (ad-hoc sign)
codesign --force --deep --sign - "${oldAppPath}" 2>/dev/null

# Launch the new app
open "${oldAppPath}"

# Clean up backup and temp files
sleep 5
rm -rf "${backupPath}"
rm -rf "${extractDir}"
rm -f "${zipPath}"
rm -f "${updateScript}"
`,
      { mode: 0o755 },
    );

    logger.info("[AutoUpdater] macOS: Spawning update script and quitting");

    // Spawn the script detached so it lives after we quit
    const child = spawn("bash", [updateScript], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Quit the app so the script can replace it
    app.quit();
  }

  private async applyWindowsUpdate(filePath: string): Promise<void> {
    if (filePath.endsWith(".exe")) {
      // It's a Squirrel installer — run it directly
      spawn(filePath, ["--updated"], {
        detached: true,
        stdio: "ignore",
      }).unref();
      app.quit();
      return;
    }

    if (filePath.endsWith(".zip")) {
      const appDir = path.dirname(app.getPath("exe"));
      const extractDir = path.join(
        app.getPath("temp"),
        "produchive-update-extract",
      );

      try {
        await fsPromises.rm(extractDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      await fsPromises.mkdir(extractDir, { recursive: true });

      // Use PowerShell to extract
      execSync(
        `powershell -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${extractDir}' -Force"`,
        { timeout: 120000 },
      );

      // Find the new exe
      const exeName = path.basename(app.getPath("exe"));

      // Create a BAT script to replace files and relaunch
      const updateScript = path.join(
        app.getPath("temp"),
        "produchive-update.bat",
      );
      await fsPromises.writeFile(
        updateScript,
        `@echo off
timeout /t 3 /nobreak > nul
set "srcDir=${extractDir}"
for /d %%I in ("${extractDir}\\*") do (
  if exist "%%I\\${exeName}" set "srcDir=%%I"
)
xcopy /s /y /q /i "%srcDir%\\*" "${appDir}\\"
start "" "${path.join(appDir, exeName)}"
timeout /t 5 /nobreak > nul
rmdir /s /q "${extractDir}"
del /f "${filePath}"
del /f "%~f0"
`,
      );

      spawn("cmd.exe", ["/c", updateScript], {
        detached: true,
        stdio: "ignore",
      }).unref();
      app.quit();
      return;
    }

    throw new Error("Unsupported Windows update format");
  }

  private async applyLinuxUpdate(filePath: string): Promise<void> {
    if (filePath.endsWith(".deb")) {
      // Launch dpkg in a terminal — needs sudo
      const result = dialog.showMessageBoxSync({
        type: "info",
        title: "Install Update",
        message:
          "The update has been downloaded. Would you like to install it?\n\nThis requires administrator privileges.",
        buttons: ["Install", "Open File Location", "Cancel"],
        defaultId: 0,
      });

      if (result === 0) {
        // Try pkexec for graphical sudo
        try {
          spawn("pkexec", ["dpkg", "-i", filePath], {
            detached: true,
            stdio: "ignore",
          }).unref();
          app.quit();
        } catch {
          shell.showItemInFolder(filePath);
        }
      } else if (result === 1) {
        shell.showItemInFolder(filePath);
      }
      return;
    }

    if (filePath.endsWith(".rpm")) {
      const result = dialog.showMessageBoxSync({
        type: "info",
        title: "Install Update",
        message:
          "The update has been downloaded. Would you like to install it?\n\nThis requires administrator privileges.",
        buttons: ["Install", "Open File Location", "Cancel"],
        defaultId: 0,
      });

      if (result === 0) {
        try {
          spawn("pkexec", ["rpm", "-U", filePath], {
            detached: true,
            stdio: "ignore",
          }).unref();
          app.quit();
        } catch {
          shell.showItemInFolder(filePath);
        }
      } else if (result === 1) {
        shell.showItemInFolder(filePath);
      }
      return;
    }

    // Fallback: open the folder
    shell.showItemInFolder(filePath);
  }

  /** Get the cached latest update info (for renderer to query) */
  getLatestUpdateInfo(): UpdateInfo | null {
    return this.latestUpdateInfo;
  }

  /** Get the downloaded file path */
  getDownloadedFilePath(): string | null {
    return this.downloadedFilePath;
  }

  /** Clean up temp files */
  async cleanup() {
    const tmpDir = path.join(app.getPath("temp"), "produchive-update");
    try {
      await fsPromises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let updaterInstance: GitHubAutoUpdater | null = null;

export function getAutoUpdater(): GitHubAutoUpdater {
  if (!updaterInstance) {
    updaterInstance = new GitHubAutoUpdater();
  }
  return updaterInstance;
}
