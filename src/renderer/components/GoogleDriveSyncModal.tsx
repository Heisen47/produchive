import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FolderOpen,
  FolderSync,
  Laptop,
  HardDriveUpload,
  HardDriveDownload,
  Key,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  FileCheck2,
  SlidersHorizontal,
  Folder,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import {
  getRememberedPassphrase,
  saveRememberedPassphrase,
  DEFAULT_SYNC_FILENAME,
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

  const [passphrase, setPassphrase] = useState(getRememberedPassphrase() || '');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [rememberPassphrase, setRememberPassphrase] = useState(Boolean(getRememberedPassphrase()));
  const [isCopied, setIsCopied] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState(getDeviceName());

  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    action?: {
      label: string;
      onClick: () => void;
    };
    summary?: MergeSummary;
  } | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncMode, setSyncMode] = useState<'merge' | 'overwrite'>('merge');
  const [fileName, setFileName] = useState(DEFAULT_SYNC_FILENAME);

  // Load local folder info on open
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      refreshLocalFolderInfo();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGenerateKey = () => {
    const newKey = generateEncryptionKey();
    setPassphrase(newKey);
    setShowPassphrase(true);
    saveRememberedPassphrase(newKey, rememberPassphrase);
    setStatusMessage({
      type: 'info',
      text: 'New sync key generated. Use this same key on your other device.',
    });
  };

  const handleCopyKey = () => {
    if (!passphrase) return;
    navigator.clipboard.writeText(passphrase);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getFileManagerLabel = () => {
    const p = localFolderInfo?.platform;
    if (p === 'darwin' || (!p && navigator.userAgent.includes('Mac'))) return 'Finder';
    if (p === 'win32' || (!p && navigator.userAgent.includes('Win'))) return 'Explorer';
    return 'Folder';
  };

  const handleOpenLocalFolder = async () => {
    if (window.electronAPI?.openSyncFolder) {
      await window.electronAPI.openSyncFolder();
      await refreshLocalFolderInfo();
    }
  };

  const handleShowFileInFolder = async (targetPath?: string) => {
    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(targetPath || fileName);
    } else if (window.electronAPI?.openSyncFolder) {
      await window.electronAPI.openSyncFolder();
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
          const targetPath = res.fullPath || fileName;
          setStatusMessage({
            type: 'success',
            text: `Backup saved to local sync directory!`,
            action: {
              label: `Show in ${getFileManagerLabel()}`,
              onClick: () => handleShowFileInFolder(targetPath),
            },
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
        text: `Saved "${fileName}" to downloads.`,
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
            `File "${fileName}" not found in your sync folder. Copy it into that folder or browse from disk.`
          );
        }

        const decrypted = await decryptSyncPackage(res.content, passphrase.trim());
        const summary = await mergeSyncPayload(decrypted, syncMode);
        await refreshLocalFolderInfo();

        setStatusMessage({
          type: 'success',
          text: `Imported from ${decrypted.deviceName || 'device'}! Merged ${summary.tasksAdded} tasks and ${summary.routinesAdded} routines.`,
          summary,
        });

        if (onSyncComplete) onSyncComplete();
        return;
      }

      throw new Error('Local sync folder reader unavailable. Please choose file from disk.');
    } catch (err: any) {
      console.error('Local import error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Decryption failed. Please check encryption key.',
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
          text: `File "${file.name}" imported! Merged ${summary.tasksAdded} tasks, ${summary.routinesAdded} routines.`,
          summary,
        });
        if (onSyncComplete) onSyncComplete();
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to decrypt file. Check encryption key.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-3xl border p-5 flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-card-solid)',
          borderColor: 'var(--border-secondary)',
          boxShadow: isDark
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.08)'
            : '0 20px 50px rgba(0, 0, 0, 0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek top ambient accent line */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[2px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, #10b981, #3b82f6, transparent)',
          }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b shrink-0" style={{ borderColor: 'var(--border-secondary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
              <FolderSync size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Device Sync & Backup
                </h3>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck size={10} /> AES-256
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Offline & cloud-folder encrypted sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pt-3 pr-0.5">
          {/* Streamlined Feature Badge Row */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl border text-[11px]"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <span>Zero-knowledge client-side encryption</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span className="px-1.5 py-0.5 rounded bg-white/5">Drive</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5">Dropbox</span>
              <span className="px-1.5 py-0.5 rounded bg-white/5">iCloud</span>
            </div>
          </div>

          {/* Section 1: Encryption Key Card */}
          <div
            className="p-3 rounded-2xl border space-y-2.5"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sync Key
              </span>
              <button
                type="button"
                onClick={handleGenerateKey}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={11} />
                <span>Generate New</span>
              </button>
            </div>

            {/* Input with clean icons */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/40"
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
                className="w-full bg-transparent text-xs font-mono tracking-wider border-0 outline-none px-1"
                style={{ color: 'var(--text-primary)' }}
              />

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 active:scale-95 transition-all cursor-pointer"
                  title={showPassphrase ? 'Hide key' : 'Show key'}
                >
                  {showPassphrase ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>

                {passphrase && (
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="p-1 rounded-md text-slate-400 hover:text-emerald-400 active:scale-95 transition-all cursor-pointer"
                    title="Copy key"
                  >
                    {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>

            {/* Sub-row: Remember Key + Device Name */}
            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <label
                className="flex items-center gap-2 cursor-pointer select-none group"
                onClick={() => {
                  const nextVal = !rememberPassphrase;
                  setRememberPassphrase(nextVal);
                  saveRememberedPassphrase(passphrase, nextVal);
                }}
              >
                <div
                  className={`w-7 h-4 rounded-full transition-colors relative duration-200 ${
                    rememberPassphrase ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 absolute top-0.5 ${
                      rememberPassphrase ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span style={{ color: 'var(--text-secondary)' }} className="text-[10px] group-hover:text-slate-200 transition-colors">
                  Remember on this device
                </span>
              </label>

              <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <Laptop size={11} />
                <input
                  type="text"
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder="Device name"
                  className="bg-transparent border-b border-dashed border-slate-600/70 hover:border-slate-400 px-1 text-[10px] font-medium text-slate-300 w-24 text-right focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sync File Card */}
          <div
            className="p-3 rounded-2xl border transition-all"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)',
            }}
          >
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    localFolderInfo?.fileExists
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
                  }`}
                >
                  <FileCheck2 size={16} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {fileName}
                    </span>
                    {localFolderInfo?.fileExists ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {formatFileSize(localFolderInfo.fileSize)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium">Not generated yet</span>
                    )}
                  </div>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }} title={localFolderInfo?.folderPath}>
                    {localFolderInfo?.fileExists ? 'Ready in local sync directory' : 'Click Save File to create backup'}
                  </p>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex items-center gap-1 shrink-0">
                {localFolderInfo?.fileExists && (
                  <button
                    type="button"
                    onClick={() => handleShowFileInFolder(localFolderInfo.fullPath || fileName)}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer border border-blue-500/20"
                    title={`Reveal in ${getFileManagerLabel()}`}
                  >
                    <FolderOpen size={11} />
                    <span>Reveal</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenLocalFolder}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                  title="Open Sync Folder"
                >
                  <Folder size={13} />
                </button>

                <button
                  type="button"
                  onClick={refreshLocalFolderInfo}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Dual Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              disabled={isUploading || isDownloading}
              onClick={handleSaveToLocalSyncFolder}
              className="py-2.5 px-3 rounded-2xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer shadow-md"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              <HardDriveUpload size={14} className={isUploading ? 'animate-bounce' : ''} />
              <span>{isUploading ? 'Saving...' : 'Save File'}</span>
            </button>

            <button
              type="button"
              disabled={isUploading || isDownloading}
              onClick={handleImportFromLocalSyncFolder}
              className="py-2.5 px-3 rounded-2xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 disabled:opacity-40 cursor-pointer shadow-md"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              <HardDriveDownload size={14} className={isDownloading ? 'animate-bounce' : ''} />
              <span>{isDownloading ? 'Importing...' : 'Import File'}</span>
            </button>
          </div>

          {/* Discreet File Picker Fallback */}
          <div className="text-center pt-0.5">
            <label className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5 font-medium group">
              <FolderOpen size={12} className="group-hover:text-blue-400 transition-colors" />
              <span>Or select backup file from disk / USB</span>
              <input
                type="file"
                accept=".enc,.json"
                onChange={handleManualFileInput}
                className="hidden"
              />
            </label>
          </div>

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
                {statusMessage.action && (
                  <button
                    type="button"
                    onClick={statusMessage.action.onClick}
                    className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <FolderOpen size={11} />
                    <span>{statusMessage.action.label}</span>
                  </button>
                )}
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

          {/* Collapsible Advanced Settings */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[11px] py-1.5 px-2 rounded-xl hover:bg-white/5 transition-all font-medium cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal size={11} />
                <span>Advanced options</span>
              </div>
              <ChevronDown
                size={12}
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
                {/* Merge Strategy */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Strategy
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
                      Overwrite
                    </button>
                  </div>
                </div>

                {/* Custom File name */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    File Name
                  </span>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="py-1 px-2 rounded-lg text-[10px] font-mono border w-40 text-right"
                    style={{
                      background: 'var(--bg-card-solid)',
                      borderColor: 'var(--border-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DeviceSyncModal = GoogleDriveSyncModal;
