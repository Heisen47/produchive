/**
 * Google Drive Sync Service
 * Handles folder management, uploading and downloading encrypted sync files via Google Drive REST API v3.
 */

export interface GoogleDriveConfig {
  accessToken: string;
  userEmail: string;
  userName?: string;
  folderName: string;
  fileName: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastUploadedByDeviceId?: string;
  lastUploadedByDeviceName?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: number;
}

export interface DriveUserInfo {
  emailAddress: string;
  displayName: string;
  photoLink?: string;
}

const GDRIVE_CONFIG_KEY = 'produchive_gdrive_config';
const GDRIVE_PASSPHRASE_KEY = 'produchive_sync_passphrase_remembered';

export const DEFAULT_SYNC_FOLDER = 'Produchive Sync';
export const DEFAULT_SYNC_FILENAME = 'produchive-sync.enc';

// ─── Configuration Store ───

export function getGoogleDriveConfig(): GoogleDriveConfig {
  try {
    const raw = localStorage.getItem(GDRIVE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        accessToken: parsed.accessToken || '',
        userEmail: parsed.userEmail || '',
        userName: parsed.userName || '',
        folderName: parsed.folderName || DEFAULT_SYNC_FOLDER,
        fileName: parsed.fileName || DEFAULT_SYNC_FILENAME,
        autoSync: !!parsed.autoSync,
        lastSyncedAt: parsed.lastSyncedAt || null,
        lastUploadedByDeviceId: parsed.lastUploadedByDeviceId,
        lastUploadedByDeviceName: parsed.lastUploadedByDeviceName,
      };
    }
  } catch (e) {
    console.error('Failed to read Google Drive config:', e);
  }

  // Fallback: Check if gcal_oauth_token is already present in storage/cookies
  const fallbackToken =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('gcal_oauth_token') || ''
      : '';
  const fallbackEmail =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('gcal_user_email') || ''
      : '';

  return {
    accessToken: fallbackToken,
    userEmail: fallbackEmail,
    userName: '',
    folderName: DEFAULT_SYNC_FOLDER,
    fileName: DEFAULT_SYNC_FILENAME,
    autoSync: false,
    lastSyncedAt: null,
  };
}

export function saveGoogleDriveConfig(config: GoogleDriveConfig) {
  try {
    localStorage.setItem(GDRIVE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save Google Drive config:', e);
  }
}

export function clearGoogleDriveConfig() {
  try {
    localStorage.removeItem(GDRIVE_CONFIG_KEY);
  } catch (e) {
    console.error('Failed to clear Google Drive config:', e);
  }
}

export function isGoogleDriveConnected(): boolean {
  const config = getGoogleDriveConfig();
  return Boolean(config.accessToken && config.accessToken.trim().length > 0);
}

// ─── Remembered Passphrase Storage ───

export function getRememberedPassphrase(): string | null {
  try {
    return localStorage.getItem(GDRIVE_PASSPHRASE_KEY) || null;
  } catch {
    return null;
  }
}

export function saveRememberedPassphrase(passphrase: string, remember: boolean) {
  try {
    if (remember && passphrase) {
      localStorage.setItem(GDRIVE_PASSPHRASE_KEY, passphrase);
    } else {
      localStorage.removeItem(GDRIVE_PASSPHRASE_KEY);
    }
  } catch (e) {
    console.error('Failed to update remembered passphrase:', e);
  }
}

// ─── Network Fetch Helper (IPC fetch-url with window.fetch fallback) ───

export async function safeDriveFetch(
  url: string,
  options: any = {}
): Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> }> {
  if (typeof window !== 'undefined' && window.electronAPI?.fetchUrl) {
    try {
      const res = await window.electronAPI.fetchUrl(url, options);
      if (res && typeof res.ok === 'boolean') {
        return {
          ok: res.ok,
          status: res.status,
          text: async () => res.data || '',
          json: async () => JSON.parse(res.data || '{}'),
        };
      }
    } catch (ipcErr) {
      console.warn('IPC fetch-url failed, using fetch:', ipcErr);
    }
  }

  const res = await fetch(url, options);
  return {
    ok: res.ok,
    status: res.status,
    text: async () => await res.text(),
    json: async () => await res.json(),
  };
}

// ─── Google Drive API Methods ───

/**
 * Fetch Google user info from Drive API.
 */
export async function getDriveUserInfo(accessToken: string): Promise<DriveUserInfo> {
  if (!accessToken?.trim()) {
    throw new Error('Google Drive access token is required.');
  }

  const url = 'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)';
  const res = await safeDriveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google authorization expired. Please reconnect your Google Drive account.');
    }
    const errText = await res.text();
    throw new Error(`Failed to fetch Drive user info (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    emailAddress: data.user?.emailAddress || '',
    displayName: data.user?.displayName || 'Google Drive User',
    photoLink: data.user?.photoLink,
  };
}

/**
 * Finds or creates the specified sync folder on Google Drive.
 */
export async function findOrCreateSyncFolder(
  accessToken: string,
  folderName: string = DEFAULT_SYNC_FOLDER
): Promise<string> {
  if (!accessToken?.trim()) {
    throw new Error('Google Drive access token is required.');
  }

  const cleanName = folderName.trim().replace(/'/g, "\\'");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    cleanName
  )}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`;

  const searchRes = await safeDriveFetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: 'application/json',
    },
  });

  if (!searchRes.ok) {
    if (searchRes.status === 401) {
      throw new Error('Google authorization expired. Please reconnect your account.');
    }
    throw new Error(`Failed to find folder on Google Drive (HTTP ${searchRes.status})`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await safeDriveFetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: folderName.trim(),
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Directory for encrypted Produchive cross-device sync data',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create sync folder on Google Drive (HTTP ${createRes.status})`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Finds the sync file inside the specified folder.
 */
export async function findSyncFile(
  accessToken: string,
  folderId: string,
  fileName: string = DEFAULT_SYNC_FILENAME
): Promise<DriveFileInfo | null> {
  const cleanName = fileName.trim().replace(/'/g, "\\'");
  const url = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
    cleanName
  )}' and '${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`;

  const res = await safeDriveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to check for sync file on Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const f = data.files[0];
    return {
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      size: f.size ? Number(f.size) : undefined,
    };
  }

  return null;
}

/**
 * Uploads (creates or updates) the encrypted sync package file on Google Drive.
 */
export async function uploadEncryptedSyncFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  encryptedJsonString: string,
  existingFileId?: string
): Promise<DriveFileInfo> {
  if (!accessToken?.trim()) {
    throw new Error('Google Drive access token is required.');
  }

  // If file already exists, update content directly via uploadType=media
  if (existingFileId) {
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const patchRes = await safeDriveFetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: encryptedJsonString,
    });

    if (!patchRes.ok) {
      throw new Error(`Failed to update sync file on Google Drive (HTTP ${patchRes.status})`);
    }

    const updatedData = await patchRes.json();
    return {
      id: updatedData.id,
      name: updatedData.name || fileName,
      modifiedTime: updatedData.modifiedTime || new Date().toISOString(),
      size: encryptedJsonString.length,
    };
  }

  // Create new file via multipart upload
  const boundary = `-------ProduchiveBoundary${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: 'Encrypted Produchive cross-device synchronization payload',
  };

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    encryptedJsonString +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size';
  const uploadRes = await safeDriveFetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Failed to upload sync file to Google Drive (HTTP ${uploadRes.status}): ${errText}`);
  }

  const createdData = await uploadRes.json();
  return {
    id: createdData.id,
    name: createdData.name,
    modifiedTime: createdData.modifiedTime || new Date().toISOString(),
    size: createdData.size ? Number(createdData.size) : encryptedJsonString.length,
  };
}

/**
 * Downloads the encrypted file content from Google Drive.
 */
export async function downloadEncryptedSyncFile(
  accessToken: string,
  fileId: string
): Promise<string> {
  if (!accessToken?.trim()) {
    throw new Error('Google Drive access token is required.');
  }

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await safeDriveFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: 'application/json, text/plain',
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Sync file not found on Google Drive. Has another device uploaded yet?');
    }
    throw new Error(`Failed to download sync file from Google Drive (HTTP ${res.status})`);
  }

  return await res.text();
}
