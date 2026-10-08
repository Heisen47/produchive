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
  FolderOpen,
  Laptop,
  HardDriveUpload,
  HardDriveDownload,
  Key,
  LogOut,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  FileCheck2,
  SlidersHorizontal,
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
import {
  encryptSyncPayload,
  decryptSyncPackage,
  generateEncryptionKey,
} from '../lib/syncCrypto';
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

  // Active sync method tab: 'cloud' (Google Drive direct API) vs 'manual' (File & Folder agnostic sync)
  const [activeTab, setActiveTab] = useState<'cloud' | 'manual'>('cloud');

  const [config, setConfig] = useState(getGoogleDriveConfig());
  const [passphrase, setPassphrase] = useState(getRememberedPassphrase() || '');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [rememberPassphrase, setRememberPassphrase] = useState(Boolean(getRememberedPassphrase()));
  const [isCopied, setIsCopied] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState(getDeviceName());

  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Local sync folder state
  const [localFolderInfo, setLocalFolderInfo] = useState<{
    folderPath: string;
    fileName: string;
    fullPath: string;
    fileExists: boolean;
    fileSize?: number;
    modifiedTime?: string;
    platform: string;
  } | null>(null);

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

  // Load configuration, local folder info, and check cloud file on open
  useEffect(() => {
    if (isOpen) {
      const currentConfig = getGoogleDriveConfig();
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

      if (!currentConfig.accessToken) {
        setActiveTab('manual');
      } else {
        setActiveTab('cloud');
        refreshCloudFileInfo(currentConfig.accessToken, currentConfig.folderName, currentConfig.fileName);
      }

      refreshLocalFolderInfo();
    }
  }, [isOpen]);

  // Refresh local sync folder info from Electron IPC
  const refreshLocalFolderInfo = async () => {
    if (window.electronAPI?.getSyncFolderInfo) {
      try {
        const info = await window.electronAPI.getSyncFolderInfo();
        setLocalFolderInfo(info);
      } catch (err) {
        console.warn('Failed to get sync folder info:', err);
      }
    }
  };

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
        setActiveTab('cloud');
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

  // Key Generation & Copy Helpers
  const handleGenerateKey = () => {
    const newKey = generateEncryptionKey();
    setPassphrase(newKey);
    setShowPassphrase(true);
    saveRememberedPassphrase(newKey, rememberPassphrase);
    setStatusMessage({
      type: 'info',
      text: 'New sync key generated! Keep it secure—use this same key on your second device.',
    });
  };

  const handleCopyKey = () => {
    if (!passphrase) return;
    navigator.clipboard.writeText(passphrase);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 1. Google Drive Connect / Disconnect
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

  // 2. Direct Cloud Upload / Download
  const handleUploadToDrive = async () => {
    if (!config.accessToken) {
      setStatusMessage({ type: 'error', text: 'Please connect to Google Drive first.' });
      return;
    }
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter or generate an encryption key before syncing.',
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);
      if (deviceNameInput.trim()) setDeviceName(deviceNameInput.trim());

      const localPayload = await exportLocalSyncPayload();
      const encryptedPkg = await encryptSyncPayload(localPayload, passphrase.trim());
      const encryptedJson = JSON.stringify(encryptedPkg, null, 2);

      const folderId = await findOrCreateSyncFolder(config.accessToken, folderName);
      const existingFile = await findSyncFile(config.accessToken, folderId, fileName);
      const uploadedInfo = await uploadEncryptedSyncFile(
        config.accessToken,
        folderId,
        fileName,
        encryptedJson,
        existingFile?.id
      );

      const updatedConfig = {
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
        text: `Data encrypted & uploaded to Google Drive! (${localPayload.data.tasks.length} tasks, ${localPayload.data.routines.length} routines, ${localPayload.data.goals.length} goals).`,
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

  const handleDownloadAndSync = async () => {
    if (!config.accessToken) {
      setStatusMessage({ type: 'error', text: 'Please connect to Google Drive first.' });
      return;
    }
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the encryption key to decrypt the cloud file.',
      });
      return;
    }

    setIsDownloading(true);
    setStatusMessage(null);

    try {
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);

      const folderId = await findOrCreateSyncFolder(config.accessToken, folderName);
      const targetFile = await findSyncFile(config.accessToken, folderId, fileName);

      if (!targetFile) {
        throw new Error(
          `Sync file "${fileName}" was not found in Google Drive folder "${folderName}". Has your other device uploaded yet?`
        );
      }

      const encryptedContent = await downloadEncryptedSyncFile(config.accessToken, targetFile.id);
      const decryptedPayload = await decryptSyncPackage(encryptedContent, passphrase.trim());
      const summary = await mergeSyncPayload(decryptedPayload, syncMode);

      const updatedConfig = {
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
        text: `Synchronized from ${decryptedPayload.deviceName || 'remote device'}! Merged ${summary.tasksAdded} tasks and ${summary.routinesAdded} routines.`,
        summary,
      });

      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      console.error('Download sync error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Decryption or sync import failed. Please verify your encryption key.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 3. Manual Folder Sync (Device Agnostic)
  const handleOpenLocalFolder = async () => {
    if (window.electronAPI?.openSyncFolder) {
      await window.electronAPI.openSyncFolder();
      await refreshLocalFolderInfo();
    }
  };

  const handleSaveToLocalSyncFolder = async () => {
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter or generate an encryption key before saving.',
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);

    try {
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);
      if (deviceNameInput.trim()) setDeviceName(deviceNameInput.trim());

      const localPayload = await exportLocalSyncPayload();
      const encryptedPkg = await encryptSyncPayload(localPayload, passphrase.trim());
      const encryptedJson = JSON.stringify(encryptedPkg, null, 2);

      if (window.electronAPI?.writeLocalSyncFile) {
        const res = await window.electronAPI.writeLocalSyncFile(encryptedJson, fileName);
        if (res.success) {
          await refreshLocalFolderInfo();
          setStatusMessage({
            type: 'success',
            text: `Encrypted file "${fileName}" saved to local sync folder! You can now upload it to Drive or copy it to another device.`,
          });
          return;
        }
      }

      // Web/Fallback download if IPC unavailable
      const blob = new Blob([encryptedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: 'success',
        text: `Saved "${fileName}" to downloads. Move it to your Google Drive sync folder.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save encrypted file.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportFromLocalSyncFolder = async () => {
    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the encryption key to decrypt the file.',
      });
      return;
    }

    setIsDownloading(true);
    setStatusMessage(null);

    try {
      saveRememberedPassphrase(passphrase.trim(), rememberPassphrase);

      if (window.electronAPI?.readLocalSyncFile) {
        const res = await window.electronAPI.readLocalSyncFile(fileName);
        if (!res.success || !res.content) {
          throw new Error(
            `File "${fileName}" not found in your sync folder. Download it from Google Drive into that folder first, or use "Select File".`
          );
        }

        const decrypted = await decryptSyncPackage(res.content, passphrase.trim());
        const summary = await mergeSyncPayload(decrypted, syncMode);
        await refreshLocalFolderInfo();

        setStatusMessage({
          type: 'success',
          text: `Imported successfully from ${decrypted.deviceName || 'remote device'}! Merged ${summary.tasksAdded} tasks and ${summary.routinesAdded} routines.`,
          summary,
        });

        if (onSyncComplete) onSyncComplete();
        return;
      }

      throw new Error('Local sync folder reader unavailable. Please use "Select File" below.');
    } catch (err: any) {
      console.error('Local import error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Decryption failed. Please check your encryption key.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleManualFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!passphrase.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter the encryption key before selecting the file.',
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
          text: `File "${file.name}" imported successfully! Merged ${summary.tasksAdded} tasks and ${summary.routinesAdded} routines.`,
          summary,
        });
        if (onSyncComplete) onSyncComplete();
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to decrypt file. Please verify encryption key.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] max-h-[90vh] rounded-3xl p-5 shadow-2xl relative border overflow-hidden flex flex-col animate-scale-in"
        style={{
          background: 'var(--bg-card-solid)',
          borderColor: 'var(--border-card)',
          boxShadow: isDark
            ? '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(59, 130, 246, 0.1)'
            : '0 20px 50px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek top ambient accent glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-[2px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
          }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b shrink-0" style={{ borderColor: 'var(--border-secondary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm shrink-0">
              <Cloud size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                  Cloud & Device Sync
                </h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <ShieldCheck size={10} /> AES-256
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                End-to-end encrypted multi-device sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-0.5">
          {/* Animated Segmented Pill Switcher */}
          <div
            className="relative flex p-1 rounded-xl border"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            {/* Sliding Pill Indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-blue-600 shadow-md transition-all duration-300 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                left: activeTab === 'cloud' ? '4px' : 'calc(50% + 0px)',
              }}
            />

            <button
              type="button"
              onClick={() => setActiveTab('cloud')}
              className={`relative z-10 flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cloud' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud size={13} />
              <span>Google Drive</span>
              {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`relative z-10 flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'manual' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen size={13} />
              <span>Local File</span>
              {localFolderInfo?.fileExists && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
          </div>

          {/* Compact Encryption Key Card */}
          <div
            className="p-3 rounded-2xl border space-y-2"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                <Lock size={13} className="text-emerald-400" />
                <span>Sync Encryption Key</span>
              </div>

              {/* 1-Click Generate Key Button */}
              <button
                type="button"
                onClick={handleGenerateKey}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                title="Generate a secure random key"
              >
                <Sparkles size={11} />
                <span>Generate</span>
              </button>
            </div>

            {/* Input with embedded actions */}
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-blue-500/50"
              style={{
                background: 'var(--bg-card-solid)',
                borderColor: 'var(--border-card)',
              }}
            >
              <Key size={13} className="text-slate-400 shrink-0" />
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter or generate sync key..."
                className="w-full bg-transparent text-xs font-mono border-0 outline-none px-1"
                style={{ color: 'var(--text-primary)' }}
              />

              {/* Reveal Toggle */}
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="p-1 text-slate-400 hover:text-slate-200 active:scale-95 transition-all cursor-pointer shrink-0"
                title={showPassphrase ? 'Hide key' : 'Show key'}
              >
                {showPassphrase ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>

              {/* Copy Key Button */}
              {passphrase && (
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                  style={{
                    background: isCopied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isCopied ? '#34d399' : 'var(--text-secondary)',
                  }}
                  title="Copy key"
                >
                  {isCopied ? <Check size={11} /> : <Copy size={11} />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {/* Sub-row: Animated Toggle for Remember Key + Device Badge */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              {/* Animated Switch Button */}
              <label
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => {
                  const nextVal = !rememberPassphrase;
                  setRememberPassphrase(nextVal);
                  saveRememberedPassphrase(passphrase, nextVal);
                }}
              >
                <div
                  className={`w-7 h-4 rounded-full transition-colors relative duration-200 ${
                    rememberPassphrase ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 absolute top-0.5 ${
                      rememberPassphrase ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[10px]">
                  Remember key on this device
                </span>
              </label>

              {/* Device Name Input */}
              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Laptop size={11} />
                <input
                  type="text"
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder="Device"
                  className="bg-transparent border-b border-dashed border-slate-600 px-1 text-[10px] font-semibold text-slate-300 w-20 text-right focus:outline-none focus:border-blue-400"
                  title="Device name"
                />
              </div>
            </div>
          </div>

          {/* TAB 1: Google Drive */}
          {activeTab === 'cloud' && (
            <div className="space-y-3 animate-fade-in">
              {/* Account Status Card */}
              <div
                className="p-3 rounded-2xl border flex items-center justify-between gap-2.5"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-secondary)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-4 h-4" viewBox="0 0 87.3 78">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.4-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.4 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        Google Drive
                      </span>
                      {isConnected ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold">Not Connected</span>
                      )}
                    </div>
                    <p className="text-[11px] truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {isConnected ? config.userEmail || 'Account active' : 'Connect for 1-click cloud sync'}
                    </p>
                  </div>
                </div>

                {isConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-500/10 border border-red-500/25 active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <LogOut size={11} /> Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleGoogleConnect}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isConnecting ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
                    <span>Connect</span>
                  </button>
                )}
              </div>

              {/* Cloud Actions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isUploading || isDownloading || !isConnected}
                  onClick={handleUploadToDrive}
                  className="py-2.5 px-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <UploadCloud size={15} className={isUploading ? 'animate-bounce' : ''} />
                  <span>{isUploading ? 'Uploading...' : 'Upload to Drive'}</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isDownloading || !isConnected}
                  onClick={handleDownloadAndSync}
                  className="py-2.5 px-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  <DownloadCloud size={15} className={isDownloading ? 'animate-bounce' : ''} />
                  <span>{isDownloading ? 'Syncing...' : 'Download & Sync'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Local Folder */}
          {activeTab === 'manual' && (
            <div className="space-y-3 animate-fade-in">
              {/* Compact Directory Status */}
              <div
                className="p-3 rounded-2xl border space-y-2"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-secondary)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <FolderOpen size={13} className="text-blue-400" />
                    <span>Sync Directory</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenLocalFolder}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-500/10 border border-blue-500/25 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen size={10} /> Open
                  </button>
                </div>

                <div
                  className="p-2 rounded-xl border text-[11px] font-mono truncate select-all"
                  style={{
                    background: 'var(--bg-card-solid)',
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-secondary)',
                  }}
                  title={localFolderInfo?.folderPath || 'Sync Directory'}
                >
                  {localFolderInfo?.folderPath || 'Detecting system sync directory...'}
                </div>

                <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1">
                    {localFolderInfo?.fileExists ? (
                      <>
                        <FileCheck2 size={11} className="text-emerald-400" />
                        <span className="text-emerald-400 font-medium">
                          <code>{fileName}</code> ready ({localFolderInfo.fileSize || 0} bytes)
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={11} className="text-amber-400" />
                        <span className="text-amber-400">File not in folder yet</span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={refreshLocalFolderInfo}
                    className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={9} /> Refresh
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isUploading || isDownloading}
                  onClick={handleSaveToLocalSyncFolder}
                  className="py-2.5 px-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <HardDriveUpload size={15} className={isUploading ? 'animate-bounce' : ''} />
                  <span>Save File</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading || isDownloading}
                  onClick={handleImportFromLocalSyncFolder}
                  className="py-2.5 px-3 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  <HardDriveDownload size={15} className={isDownloading ? 'animate-bounce' : ''} />
                  <span>Import File</span>
                </button>
              </div>

              {/* File picker fallback */}
              <div className="text-center pt-0.5">
                <label className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer inline-flex items-center gap-1 font-medium">
                  <UploadCloud size={12} />
                  <span>Or select backup file from disk / USB</span>
                  <input
                    type="file"
                    accept=".enc,.json"
                    onChange={handleManualFileInput}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Feedback & Status Banner */}
          {statusMessage && (
            <div
              className={`p-2.5 rounded-2xl border text-xs flex items-start gap-2 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-red-500/15 border-red-500/30 text-red-300'
                  : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw size={14} className="text-blue-400 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1 min-w-0">
                <p className="leading-snug text-[11px]">{statusMessage.text}</p>
                {statusMessage.summary && (
                  <div className="text-[10px] opacity-80 font-mono pt-0.5">
                    Merged: {statusMessage.summary.tasksAdded} tasks, {statusMessage.summary.routinesAdded} routines
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Collapsible Advanced Settings (Animated Toggle) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-xl hover:bg-white/5 transition-all font-semibold cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={12} />
                <span>Advanced options (merge mode & names)</span>
              </div>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>

            {showAdvanced && (
              <div
                className="mt-1.5 p-3 rounded-2xl border space-y-2.5 animate-fade-in text-xs"
                style={{
                  background: 'var(--bg-elevated)',
                  borderColor: 'var(--border-secondary)',
                }}
              >
                {/* Merge Strategy Animated Toggle */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Strategy:
                  </span>
                  <div className="relative flex p-0.5 rounded-lg bg-black/30 dark:bg-black/50 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setSyncMode('merge')}
                      className={`py-1 px-2.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                        syncMode === 'merge'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Safe Merge
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncMode('overwrite')}
                      className={`py-1 px-2.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                        syncMode === 'overwrite'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Overwrite Local
                    </button>
                  </div>
                </div>

                {/* Folder & File names */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-medium block pb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Drive Folder
                    </label>
                    <input
                      type="text"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      className="w-full py-1 px-2 rounded-lg text-[10px] font-mono border"
                      style={{
                        background: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-medium block pb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Filename
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full py-1 px-2 rounded-lg text-[10px] font-mono border"
                      style={{
                        background: 'var(--bg-card-solid)',
                        borderColor: 'var(--border-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Manual Token input option */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                  >
                    {showTokenInput ? 'Hide manual token' : 'Manual token input'}
                  </button>

                  {showTokenInput && (
                    <div className="mt-1.5 flex gap-1.5">
                      <input
                        type="text"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        placeholder="Paste OAuth token..."
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
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white cursor-pointer"
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

