import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  STARTUP_TASK_ID,
  buildStartupTaskScript,
  isStartupTaskEnabled,
} from '../lib/msixStartupTask';
import { isStoreManagedInstall } from '../lib/updaterUtils';

const manifest = readFileSync(
  path.join(__dirname, '../../msix/AppxManifest.xml.in'),
  'utf8',
);

describe('isStoreManagedInstall', () => {
  it('is true only for Store installs', () => {
    expect(isStoreManagedInstall({ windowsStore: true })).toBe(true);
    expect(isStoreManagedInstall({ windowsStore: false })).toBe(false);
    expect(isStoreManagedInstall({})).toBe(false);
  });
});

describe('isStartupTaskEnabled', () => {
  it('treats enabled states as on, ignoring PowerShell line endings', () => {
    expect(isStartupTaskEnabled('Enabled\r\n')).toBe(true);
    expect(isStartupTaskEnabled('EnabledByPolicy')).toBe(true);
  });

  it('treats every other state as off', () => {
    expect(isStartupTaskEnabled('Disabled')).toBe(false);
    expect(isStartupTaskEnabled('DisabledByUser')).toBe(false);
    expect(isStartupTaskEnabled('DisabledByPolicy')).toBe(false);
    expect(isStartupTaskEnabled('')).toBe(false);
  });
});

describe('buildStartupTaskScript', () => {
  it('runs the requested action on the declared task', () => {
    expect(buildStartupTaskScript('get')).toContain(`GetAsync('${STARTUP_TASK_ID}')`);
    expect(buildStartupTaskScript('enable')).toContain('RequestEnableAsync');
    expect(buildStartupTaskScript('disable')).toContain('$task.Disable()');
  });
});

describe('MSIX manifest', () => {
  it('declares the startup task the app controls, off by default', () => {
    expect(manifest).toContain(`TaskId="${STARTUP_TASK_ID}" Enabled="false"`);
  });

  it('declares the produchive:// protocol', () => {
    expect(manifest).toContain('<uap:Protocol Name="produchive">');
  });
});
