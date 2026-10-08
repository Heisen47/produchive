import { describe, it, expect } from 'vitest';
import {
  encryptSyncPayload,
  decryptSyncPackage,
  SyncDataPayload,
  bufferToBase64,
  base64ToBuffer,
} from '../renderer/lib/syncCrypto';

describe('Sync Cryptography (AES-256-GCM + PBKDF2)', () => {
  const samplePayload: SyncDataPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    timestamp: Date.now(),
    deviceId: 'test-device-123',
    deviceName: 'MacBook Pro',
    data: {
      tasks: [
        { id: 't1', text: 'Task 1', completed: false, created: 1000 },
        { id: 't2', text: 'Task 2', completed: true, created: 2000 },
      ],
      routines: [
        {
          id: 'r1',
          title: 'Morning Deep Work',
          dateStr: '2026-10-08',
          startHour: 9,
          startMinute: 0,
          durationMinutes: 90,
          category: 'development',
          priority: 'high',
          completed: false,
        } as any,
      ],
      goals: ['Ship sync feature', 'Drink water'],
      ratings: [{ id: 'rat-1', score: 5, date: '2026-10-08' }],
      focusSessions: [{ id: 'fs-1', scene: 'library', durationSeconds: 1500 }],
      settings: { selectedRole: 'Software Engineer', isDarkMode: true },
    },
  };

  it('correctly encodes and decodes base64 buffers', () => {
    const original = new Uint8Array([0, 1, 2, 250, 255]);
    const b64 = bufferToBase64(original);
    const roundtrip = base64ToBuffer(b64);
    expect(Array.from(roundtrip)).toEqual(Array.from(original));
  });

  it('encrypts and successfully decrypts with correct passphrase', async () => {
    const passphrase = 'SuperSecretPassphrase123!';
    const encryptedPkg = await encryptSyncPayload(samplePayload, passphrase);

    expect(encryptedPkg.algorithm).toBe('AES-256-GCM');
    expect(encryptedPkg.kdf).toBe('PBKDF2-SHA256');
    expect(encryptedPkg.ciphertext).toBeTruthy();
    expect(encryptedPkg.metadata.counts?.tasks).toBe(2);
    expect(encryptedPkg.metadata.counts?.routines).toBe(1);

    const decrypted = await decryptSyncPackage(encryptedPkg, passphrase);
    expect(decrypted.deviceId).toBe(samplePayload.deviceId);
    expect(decrypted.data.tasks).toHaveLength(2);
    expect(decrypted.data.tasks[0].text).toBe('Task 1');
    expect(decrypted.data.routines[0].title).toBe('Morning Deep Work');
    expect(decrypted.data.goals).toEqual(['Ship sync feature', 'Drink water']);
  });

  it('supports decrypting from a stringified JSON package', async () => {
    const passphrase = 'Passphrase456!';
    const encryptedPkg = await encryptSyncPayload(samplePayload, passphrase);
    const jsonString = JSON.stringify(encryptedPkg);

    const decrypted = await decryptSyncPackage(jsonString, passphrase);
    expect(decrypted.data.tasks).toHaveLength(2);
  });

  it('fails decryption when provided with the wrong passphrase', async () => {
    const encryptedPkg = await encryptSyncPayload(samplePayload, 'RightPassword');
    await expect(decryptSyncPackage(encryptedPkg, 'WrongPassword')).rejects.toThrow(
      /Decryption failed|Incorrect passphrase/
    );
  });

  it('fails decryption when ciphertext is tampered with', async () => {
    const encryptedPkg = await encryptSyncPayload(samplePayload, 'ValidPass');
    // Tamper with ciphertext
    const tampered = { ...encryptedPkg, ciphertext: encryptedPkg.ciphertext.slice(0, -4) + 'AAAA' };
    await expect(decryptSyncPackage(tampered, 'ValidPass')).rejects.toThrow();
  });

  it('rejects empty passphrase during encryption and decryption', async () => {
    await expect(encryptSyncPayload(samplePayload, '')).rejects.toThrow(
      'Encryption passphrase cannot be empty.'
    );
    const encryptedPkg = await encryptSyncPayload(samplePayload, 'ValidPass');
    await expect(decryptSyncPackage(encryptedPkg, '   ')).rejects.toThrow(
      'Decryption passphrase cannot be empty.'
    );
  });
});
