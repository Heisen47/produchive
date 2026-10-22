/**
 * Produchive End-to-End Sync Cryptography Module
 * Uses AES-256-GCM authenticated encryption with PBKDF2 key derivation.
 */

export interface EncryptedSyncPackage {
  version: number;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string;   // base64
  ciphertext: string; // base64
  checksum: string; // sha-256 of plain json
  metadata: {
    deviceId: string;
    deviceName: string;
    exportedAt: string;
    timestamp: number;
    counts?: {
      tasks: number;
      routines: number;
      goals: number;
      focusSessions?: number;
      ratings?: number;
    };
  };
}

export interface SyncDataPayload {
  version: number;
  exportedAt: string;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  data: {
    tasks: any[];
    routines: any[];
    goals: string[];
    ratings: any[];
    focusSessions: any[];
    settings: Record<string, any>;
  };
}

const ITERATIONS = 100_000;
const KEY_LENGTH = 256;

// Helper: Uint8Array <-> Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Compute SHA-256 hex string for integrity validation
async function sha256Hex(data: string): Promise<string> {
  const enc = new TextEncoder();
  const subtle = (globalThis.crypto?.subtle || (globalThis as any).crypto?.webcrypto?.subtle);
  const digest = await subtle.digest('SHA-256', enc.encode(data));
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES-GCM CryptoKey from passphrase and salt
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const subtle = (globalThis.crypto?.subtle || (globalThis as any).crypto?.webcrypto?.subtle);
  
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a SyncDataPayload using AES-256-GCM.
 */
export async function encryptSyncPayload(
  payload: SyncDataPayload,
  passphrase: string
): Promise<EncryptedSyncPackage> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Encryption passphrase cannot be empty.');
  }

  const plainJson = JSON.stringify(payload);
  const checksum = await sha256Hex(plainJson);

  // Generate 16-byte salt and 12-byte IV for AES-GCM
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const subtle = (globalThis.crypto?.subtle || (globalThis as any).crypto?.webcrypto?.subtle);
  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainJson)
  );

  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(cipherBuffer),
    checksum,
    metadata: {
      deviceId: payload.deviceId,
      deviceName: payload.deviceName,
      exportedAt: payload.exportedAt,
      timestamp: payload.timestamp,
      counts: {
        tasks: payload.data.tasks?.length || 0,
        routines: payload.data.routines?.length || 0,
        goals: payload.data.goals?.length || 0,
        focusSessions: payload.data.focusSessions?.length || 0,
        ratings: payload.data.ratings?.length || 0,
      },
    },
  };
}

/**
 * Decrypt an EncryptedSyncPackage using AES-256-GCM.
 */
export async function decryptSyncPackage(
  pkg: EncryptedSyncPackage | string,
  passphrase: string
): Promise<SyncDataPayload> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Decryption passphrase cannot be empty.');
  }

  let parsedPkg: EncryptedSyncPackage;
  if (typeof pkg === 'string') {
    try {
      parsedPkg = JSON.parse(pkg);
    } catch {
      throw new Error('Invalid sync package format: Expected JSON string.');
    }
  } else {
    parsedPkg = pkg;
  }

  if (
    !parsedPkg.ciphertext ||
    !parsedPkg.iv ||
    !parsedPkg.salt ||
    parsedPkg.algorithm !== 'AES-256-GCM'
  ) {
    throw new Error('Unsupported or malformed sync package.');
  }

  const salt = base64ToBuffer(parsedPkg.salt);
  const iv = base64ToBuffer(parsedPkg.iv);
  const ciphertext = base64ToBuffer(parsedPkg.ciphertext);

  const key = await deriveKey(passphrase, salt);

  const subtle = (globalThis.crypto?.subtle || (globalThis as any).crypto?.webcrypto?.subtle);
  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  } catch (err) {
    throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
  }

  const dec = new TextDecoder();
  const plainText = dec.decode(plainBuffer);

  // Validate checksum if provided
  if (parsedPkg.checksum) {
    const computed = await sha256Hex(plainText);
    if (computed !== parsedPkg.checksum) {
      throw new Error('Data integrity check failed: Checksum mismatch.');
    }
  }

  return JSON.parse(plainText) as SyncDataPayload;
}

/**
 * Generates a cryptographically secure random encryption key formatted for readability.
 * Example: a4f2-9c1e-7b3d-8e5a-2f4c-1d0b-6e9a-3c5f
 */
export function generateEncryptionKey(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.match(/.{1,4}/g)?.join('-') || hex;
}
