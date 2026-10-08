import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Lock,
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Folder,
  FileCode,
  Laptop,
  HardDriveUpload,
  HardDriveDownload,
  Key,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import {
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  clearGoogleDriveConfig,
  isGoogleDriveConnected,
  getRememberedPassphrase,
  saveRememberedPassphrase,
  findOrCreateSyncFolder,
  findSyncFile,
  uploadEncryptedSyncFile,
  downloadEncryptedSyncFile,
  DEFAULT_SYNC_FOLDER,
  DEFAULT_SYNC_FILENAME,
  DriveFileInfo,
} from '../lib/googleDrive';
import { encryptSyncPayload, decryptSyncPackage } from '../lib/syncCrypto';
import {
  exportLocalSyncPayload,
  mergeSyncPayload,
  getDeviceName,
  setDeviceName,
  MergeSummary,
} from '../lib/syncDataEngine';
import { getGoogleUserEmail, getGoogleAuthToken } from '../lib/googleCalendar';
import { API_BASE_URL } from '../lib/config';
import { openUrl } from '../lib/urls';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const { isDark } = useTheme();

  const [config, setConfig] = useState(getGoogleDriveConfig());
  const [passphrase, setPassphrase] = useState(getRememberedPassphrase() || '');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [rememberPassphrase, setRememberPassphrase] = useState(Boolean(getRememberedPassphrase()));
  const [deviceNameInput, setDeviceNameInput] = useState(getDeviceName());

  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [cloudFileInfo, setCloudFileInfo] = useState<DriveFileInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    summary?: MergeSummary;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncMode, setSyncMode] = useState<'merge' | 'overwrite'>('merge');
  const [folderName, setFolderName] = useState(config.folderName || DEFAULT_SYNC_FOLDER);
  const [fileName, setFileName] = useState(config.fileName || DEFAULT_SYNC_FILENAME);
  const [manualToken, setManualToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const isConnected = isGoogleDriveConnected();

  // Load configuration and check cloud file on open
  useEffect(() => {
    if (isOpen) {
      const currentConfig = getGoogleDriveConfig();
      // Auto-inherit token from Google Auth if available
      if (!currentConfig.accessToken) {
        const existingToken = getGoogleAuthToken();
        const existingEmail = getGoogleUserEmail();
        if (existingToken) {
          currentConfig.accessToken = existingToken;
          currentConfig.userEmail = existingEmail || '';
          saveGoogleDriveConfig(currentConfig);
        }
      }

      setConfig(currentConfig);
      setFolderName(currentConfig.folderName || DEFAULT_SYNC_FOLDER);
      setFileName(currentConfig.fileName || DEFAULT_SYNC_FILENAME);
      setStatusMessage(null);

      if (currentConfig.accessToken) {
        refreshCloudFileInfo(currentConfig.accessToken, currentConfig.folderName, currentConfig.fileName);
      }
    }
  }, [isOpen]);

  // Listen for deep-linked Google OAuth token
  useEffect(() => {
    const handleAuthDone = () => {
      const token = getGoogleAuthToken();
      const email = getGoogleUserEmail();
      if (token) {
        const updated = {
          ...getGoogleDriveConfig(),
          accessToken: token,
          userEmail: email || '',
        };
        saveGoogleDriveConfig(updated);
        setConfig(updated);
        setStatusMessage({
          type: 'success',
          text: `Connected to Google Drive (${email || 'Account'}).`,
        });
        refreshCloudFileInfo(token, updated.folderName, updated.fileName);
      }
    };

    window.addEventListener('produchive_gcal_authenticated', handleAuthDone);
    return () => {
      window.removeEventListener('produchive_gcal_authenticated', handleAuthDone);
    };
  }, []);

  const refreshCloudFileInfo = async (token: string, folder: string, file: string) => {
    try {
      const folderId = await findOrCreateSyncFolder(token, folder);
      const existing = await findSyncFile(token, folderId, file);
      setCloudFileInfo(existing);
    } catch (err: any) {
      console.warn('Could not inspect cloud file:', err);
    }
  };

  if (!isOpen) return null;

  // ─── 1. Google Drive Sign In ───
  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage({
      type: 'info',
      text: 'Opening Google Sign-In in browser... Please approve permissions.',
    });

    try {
      const userEmail = config.userEmail || getGoogleUserEmail();
      const hint = userEmail ? `&login_hint=${encodeURIComponent(userEmail)}` : '';
      openUrl(`${API_BASE_URL}/auth/google?from=app${hint}`);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to open Google Sign-In.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleApplyManualToken = () => {
    if (!manualToken.trim()) return;
    const updated = {
      ...config,
      accessToken: manualToken.trim(),
    };
    saveGoogleDriveConfig(updated);
    setConfig(updated);
    setShowTokenInput(false);
    setManualToken('');
    setStatusMessage({ type: 'success', text: 'Custom access token applied.' });
    refreshCloudFileInfo(updated.accessToken, updated.folderName, updated.fileName);
  };

  const handleDisconnect = () => {
    clearGoogleDriveConfig();
    setConfig(getGoogleDriveConfig());
    setCloudFileInfo(null);
    setStatusMessage({ type: 'info', text: 'Disconnected from Google Drive.' });
  };

  // ─── 2. Encrypt & Upload to Google Drive ───
  const handleUploadToDrive = async () => {
    if (!config.accessToken) {
      setStatusMessage({ type: 'error', text: 'Please connect to Google Drive first.' });
      return;
    }
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter an encryption passphrase to safeguard your data.',
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      // Save remembered passphrase preference
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);
      if (deviceNameInput.trim()) {
        setDeviceName(deviceNameInput.trim());
      }

      // 1. Gather all local data
      const localPayload = await exportLocalSyncPayload();

      // 2. Encrypt using AES-256-GCM + PBKDF2
      const encryptedPkg = await encryptSyncPayload(localPayload, passphrase.trim());
      const encryptedJson = JSON.stringify(encryptedPkg, null, 2);

      // 3. Locate / Create target sync folder in Google Drive
      const folderId = await findOrCreateSyncFolder(config.accessToken, folderName);

      // 4. Check if sync file exists on Drive
      const existingFile = await findSyncFile(config.accessToken, folderId, fileName);

      // 5. Upload payload to Google Drive
      const uploadedInfo = await uploadEncryptedSyncFile(
        config.accessToken,
        folderId,
        fileName,
        encryptedJson,
        existingFile?.id
      );

      // 6. Update local config record
      const updatedConfig: typeof config = {
        ...config,
        folderName,
        fileName,
        lastSyncedAt: new Date().toISOString(),
        lastUploadedByDeviceId: localPayload.deviceId,
        lastUploadedByDeviceName: localPayload.deviceName,
      };
      saveGoogleDriveConfig(updatedConfig);
      setConfig(updatedConfig);
      setCloudFileInfo(uploadedInfo);

      setStatusMessage({
        type: 'success',
        text: `Data successfully encrypted & uploaded to Google Drive folder "${folderName}"! (Uploaded ${localPayload.data.tasks.length} tasks, ${localPayload.data.routines.length} routines, ${localPayload.data.goals.length} goals).`,
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      console.error('Upload sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to encrypt and upload to Google Drive.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ─── 3. Download & Decrypt from Google Drive ───
  const handleDownloadAndSync = async () => {
    if (!config.accessToken) {
      setStatusMessage({ type: 'error', text: 'Please connect to Google Drive first.' });
      return;
    }
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the encryption passphrase to decrypt the data.',
      });
      return;
    }

    setIsDownloading(true);
    setStatusMessage(null);

    try {
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);

      // 1. Locate folder and sync file on Google Drive
      const folderId = await findOrCreateSyncFolder(config.accessToken, folderName);
      const targetFile = await findSyncFile(config.accessToken, folderId, fileName);

      if (!targetFile) {
        throw new Error(
          `Sync file "${fileName}" was not found in folder "${folderName}". Please upload from your other device first.`
        );
      }

      // 2. Download encrypted payload
      const encryptedContent = await downloadEncryptedSyncFile(config.accessToken, targetFile.id);

      // 3. Decrypt using AES-256-GCM
      const decryptedPayload = await decryptSyncPackage(encryptedContent, passphrase.trim());

      // 4. Merge into local database and routine storage
      const summary = await mergeSyncPayload(decryptedPayload, syncMode);

      // 5. Update local state
      const updatedConfig: typeof config = {
        ...config,
        lastSyncedAt: new Date().toISOString(),
        lastUploadedByDeviceId: decryptedPayload.deviceId,
        lastUploadedByDeviceName: decryptedPayload.deviceName,
      };
      saveGoogleDriveConfig(updatedConfig);
      setConfig(updatedConfig);
      setCloudFileInfo(targetFile);

      setStatusMessage({
        type: 'success',
        text: `Synced successfully from ${decryptedPayload.deviceName || 'remote device'}! Merged ${summary.tasksAdded} new tasks, updated ${summary.tasksUpdated} tasks, and merged ${summary.routinesAdded} routines.`,
        summary,
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      console.error('Download sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Decryption or sync import failed. Please verify your passphrase.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── 4. Offline Encrypted File Export / Import ───
  const handleExportOfflineFile = async () => {
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter an encryption passphrase before exporting.',
      });
      return;
    }

    try {
      const payload = await exportLocalSyncPayload();
      const encryptedPkg = await encryptSyncPayload(payload, passphrase.trim());
      const blob = new Blob([JSON.stringify(encryptedPkg, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produchive-backup-${new Date().toISOString().split('T')[0]}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: 'Encrypted backup file saved to your device.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Export failed.' });
    }
  };

  const handleImportOfflineFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the encryption passphrase before importing the file.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const decrypted = await decryptSyncPackage(text, passphrase.trim());
        const summary = await mergeSyncPayload(decrypted, syncMode);
        setStatusMessage({
          type: 'success',
          text: `Offline backup imported successfully! Added ${summary.tasksAdded} tasks and ${summary.routinesAdded} routines.`,
          summary,
        });
        if (onSyncComplete) onSyncComplete();
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to decrypt and import offline file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-xl max-h-[90vh] rounded-3xl p-6 shadow-2xl relative border overflow-hidden flex flex-col"
        style={{
          background: 'var(--bg-card-solid)',
          borderColor: 'var(--border-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-4 border-b mb-4 shrink-0"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shadow-sm">
              <Cloud size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                  Device & Google Drive Sync
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck size={11} /> AES-256 Encrypted
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Sync tasks, routines, and goals between multiple devices via Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {/* 1. Google Drive Account Card */}
          <div
            className="p-4 rounded-2xl border transition-all"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 87.3 78">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.4-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      Google Drive
                    </span>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-500 font-semibold">
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {isConnected
                      ? config.userEmail || 'Connected to Drive'
                      : 'Connect your Drive to sync between devices'}
                  </p>
                </div>
              </div>

              {isConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <LogOut size={12} /> Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={handleGoogleConnect}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Cloud size={13} />
                  )}
                  <span>Connect Drive</span>
                </button>
              )}
            </div>

            {/* Path info when connected */}
            {isConnected && (
              <div
                className="mt-3 pt-3 border-t text-[11px] flex flex-wrap items-center justify-between gap-2"
                style={{ borderColor: 'var(--border-secondary)', color: 'var(--text-secondary)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Folder size={12} className="text-blue-500" />
                  <span>
                    Sync Folder: <strong className="font-mono text-blue-400">{folderName}</strong> / <strong className="font-mono">{fileName}</strong>
                  </span>
                </div>
                {cloudFileInfo ? (
                  <span className="text-emerald-500 font-semibold">
                    Cloud file active • Last updated: {new Date(cloudFileInfo.modifiedTime).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-amber-500">
                    No sync file on Drive yet (ready to upload)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2. End-to-End Encryption Safeguard Card */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Lock size={15} />
                </div>
                <div>
                  <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    End-to-End Encryption Key
                  </h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Your secret passphrase is never sent to Google. It encrypts your data on your device.
                  </p>
                </div>
              </div>
            </div>

            {/* Passphrase Input */}
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter sync encryption passphrase..."
                className="w-full py-2.5 pl-9 pr-10 rounded-xl text-xs font-mono border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  background: 'var(--bg-card-solid)',
                  borderColor: 'var(--border-card)',
                  color: 'var(--text-primary)',
                }}
              />
              <Key
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={rememberPassphrase}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberPassphrase(checked);
                    saveRememberedPassphrase(passphrase, checked);
                  }}
                  className="rounded border-slate-600 accent-blue-500"
                />
                <span className="text-[11px]">Remember passphrase on this device</span>
              </label>

              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <Laptop size={12} className="text-slate-400" />
                <input
                  type="text"
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder="Device Name"
                  className="bg-transparent border-b border-dashed border-slate-500 px-1 py-0.5 text-[11px] font-semibold text-slate-300 w-28 text-right focus:outline-none focus:border-blue-400"
                  title="Edit device identifier"
                />
              </div>
            </div>
          </div>

          {/* 3. Primary Sync Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Upload Button */}
            <button
              type="button"
              disabled={isUploading || isDownloading || !isConnected}
              onClick={handleUploadToDrive}
              className="py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:scale-100 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)',
              }}
            >
              <div className="flex items-center gap-2">
                <UploadCloud size={16} className={isUploading ? 'animate-bounce' : ''} />
                <span>{isUploading ? 'Encrypting & Uploading...' : 'Upload to Drive'}</span>
              </div>
              <span className="text-[10px] opacity-80 font-normal">
                Encrypt & push local data to Drive
              </span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              disabled={isUploading || isDownloading || !isConnected}
              onClick={handleDownloadAndSync}
              className="py-3 px-4 rounded-2xl text-xs font-bold text-white shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:scale-100 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.35)',
              }}
            >
              <div className="flex items-center gap-2">
                <DownloadCloud size={16} className={isDownloading ? 'animate-bounce' : ''} />
                <span>{isDownloading ? 'Downloading & Decrypting...' : 'Download & Sync'}</span>
              </div>
              <span className="text-[10px] opacity-80 font-normal">
                Pull from Drive & merge into device
              </span>
            </button>
          </div>

          {/* Feedback & Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-300'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw size={16} className="text-blue-500 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="space-y-1">
                <p className="leading-relaxed">{statusMessage.text}</p>
                {statusMessage.summary && (
                  <div className="text-[11px] opacity-90 font-mono pt-1">
                    Total in app: {statusMessage.summary.totalTasks} Tasks • {statusMessage.summary.totalRoutines} Routines
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Advanced Settings Toggle */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs py-2 px-3 rounded-xl hover:bg-slate-500/10 transition-all font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>Advanced Options & Offline Backup</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAdvanced && (
              <div
                className="mt-2 p-3.5 rounded-2xl border space-y-3 animate-fade-in text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-secondary)',
                }}
              >
                {/* Sync Mode */}
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Merge Strategy:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSyncMode('merge')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        syncMode === 'merge'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-500/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Safe Merge
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMode('overwrite')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        syncMode === 'overwrite'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-slate-500/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Overwrite Local
                    </button>
                  </div>
                </div>

                {/* Drive Folder & File Names */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      Folder Name
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-mono border"
                      style={{
                        background: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      Filename
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-mono border"
                      style={{
                        background: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Offline File Backup Buttons */}
                <div
                  className="pt-2 border-t flex items-center justify-between gap-2"
                  style={{ borderColor: 'var(--border-secondary)' }}
                >
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Offline Encrypted File:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportOfflineFile}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 hover:bg-slate-500/10 transition-all cursor-pointer"
                      style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
                    >
                      <HardDriveDownload size={12} /> Export File
                    </button>
                    <label className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 hover:bg-slate-500/10 transition-all cursor-pointer">
                      <HardDriveUpload size={12} /> Import File
                      <input
                        type="file"
                        accept=".enc,.json"
                        onChange={handleImportOfflineFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Manual Token fallback */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    className="text-[10px] text-blue-400 hover:underline"
                  >
                    {showTokenInput ? 'Hide custom token input' : 'Enter custom OAuth token manually'}
                  </button>

                  {showTokenInput && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Paste Google OAuth access token..."
                        className="flex-1 py-1 px-2 rounded-lg text-[10px] font-mono border"
                        style={{
                          background: 'var(--bg-card-solid)',
                          borderColor: 'var(--border-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyManualToken}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
