import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_SYNC_FOLDER,
  DEFAULT_SYNC_FILENAME,
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  clearGoogleDriveConfig,
  isGoogleDriveConnected,
  saveRememberedPassphrase,
  getRememberedPassphrase,
  findOrCreateSyncFolder,
  findSyncFile,
  downloadEncryptedSyncFile,
} from '../renderer/lib/googleDrive';

describe('Google Drive Service', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    });
    vi.restoreAllMocks();
  });

  it('provides default config when storage is empty', () => {
    const config = getGoogleDriveConfig();
    expect(config.folderName).toBe(DEFAULT_SYNC_FOLDER);
    expect(config.fileName).toBe(DEFAULT_SYNC_FILENAME);
    expect(config.accessToken).toBe('');
    expect(isGoogleDriveConnected()).toBe(false);
  });

  it('persists and clears configuration correctly', () => {
    saveGoogleDriveConfig({
      accessToken: 'token-abc-123',
      userEmail: 'user@example.com',
      folderName: 'Custom Sync Folder',
      fileName: 'custom-sync.enc',
      autoSync: true,
      lastSyncedAt: '2026-10-08T12:00:00Z',
    });

    expect(isGoogleDriveConnected()).toBe(true);
    const loaded = getGoogleDriveConfig();
    expect(loaded.accessToken).toBe('token-abc-123');
    expect(loaded.userEmail).toBe('user@example.com');
    expect(loaded.folderName).toBe('Custom Sync Folder');

    clearGoogleDriveConfig();
    expect(isGoogleDriveConnected()).toBe(false);
  });

  it('manages remembered passphrase storage', () => {
    saveRememberedPassphrase('secretKey999', true);
    expect(getRememberedPassphrase()).toBe('secretKey999');

    saveRememberedPassphrase('secretKey999', false);
    expect(getRememberedPassphrase()).toBeNull();
  });

  it('finds existing folder on Google Drive', async () => {
    const mockFilesResponse = {
      files: [{ id: 'folder-123', name: DEFAULT_SYNC_FOLDER }],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockFilesResponse,
      text: async () => JSON.stringify(mockFilesResponse),
    } as any);

    const folderId = await findOrCreateSyncFolder('mock-token', DEFAULT_SYNC_FOLDER);
    expect(folderId).toBe('folder-123');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("name='Produchive%20Sync'"),
      expect.anything()
    );
  });

  it('creates folder if not found on Google Drive', async () => {
    // 1st call: search (empty files list)
    // 2nd call: create (returns created folder id)
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] as any[] }),
        text: async () => JSON.stringify({ files: [] }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-folder-789' }),
        text: async () => JSON.stringify({ id: 'new-folder-789' }),
      } as any);

    const folderId = await findOrCreateSyncFolder('mock-token', 'New Folder');
    expect(folderId).toBe('new-folder-789');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('finds sync file inside parent folder', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        files: [
          {
            id: 'file-456',
            name: DEFAULT_SYNC_FILENAME,
            modifiedTime: '2026-10-08T15:00:00Z',
            size: '1024',
          },
        ],
      }),
      text: async () => '',
    } as any);

    const file = await findSyncFile('mock-token', 'folder-123', DEFAULT_SYNC_FILENAME);
    expect(file).toBeDefined();
    expect(file?.id).toBe('file-456');
    expect(file?.size).toBe(1024);
  });

  it('downloads file content using alt=media', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"encrypted":"payload"}',
      json: async () => ({ encrypted: 'payload' }),
    } as any);

    const content = await downloadEncryptedSyncFile('mock-token', 'file-456');
    expect(content).toBe('{"encrypted":"payload"}');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/file-456?alt=media',
      expect.anything()
    );
  });
});
