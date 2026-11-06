/**
 * Launch-at-login for Microsoft Store (MSIX) builds.
 *
 * app.setLoginItemSettings doesn't work in packaged apps, so this drives the
 * startup task declared in msix/AppxManifest.xml.in through the WinRT API.
 */

import { execFile } from "node:child_process";

export const STARTUP_TASK_ID = "ProduchiveStartup";

export type StartupTaskAction = "get" | "enable" | "disable";

const ACTION_COMMANDS: Record<StartupTaskAction, string> = {
  get: "$task.State",
  enable: "Await ($task.RequestEnableAsync()) ([Windows.ApplicationModel.StartupTaskState])",
  disable: "$task.Disable(); $task.State",
};

export function buildStartupTaskScript(action: StartupTaskAction): string {
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'
} | Select-Object -First 1
function Await($operation, $resultType) {
  $task = $asTask.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  $task.Result
}
[Windows.ApplicationModel.StartupTask, Windows.ApplicationModel, ContentType = WindowsRuntime] | Out-Null
$task = Await ([Windows.ApplicationModel.StartupTask]::GetAsync('${STARTUP_TASK_ID}')) ([Windows.ApplicationModel.StartupTask])
${ACTION_COMMANDS[action]}
`;
}

export function isStartupTaskEnabled(state: string): boolean {
  const normalized = state.trim();
  return normalized === "Enabled" || normalized === "EnabledByPolicy";
}

export function runMsixStartupTask(action: StartupTaskAction): Promise<boolean> {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", buildStartupTaskScript(action)],
      { windowsHide: true, timeout: 15_000 },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(isStartupTaskEnabled(stdout));
      },
    );
  });
}
