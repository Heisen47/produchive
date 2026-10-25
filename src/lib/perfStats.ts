import { app } from 'electron';
import { performance } from 'node:perf_hooks';
import { createLogger } from './logger';

// Dev-only performance stats. Enabled automatically for unpackaged (dev) runs,
// or in a packaged build by launching with PRODUCHIVE_PERF=1.
// Output goes to the normal log file under the [Perf] context.

const logger = createLogger('Perf');

const DEFAULT_INTERVAL_MS = 30_000;

export const isPerfEnabled = (): boolean =>
    !app.isPackaged || process.env.PRODUCHIVE_PERF === '1';

// ---------- Startup timing ----------

// performance.now() is measured from process start, so marks are "ms since launch".
const startupMarks: { name: string; ms: number }[] = [];
let startupSummaryLogged = false;

export const markStartup = (name: string): void => {
    if (!isPerfEnabled()) return;
    startupMarks.push({ name, ms: Math.round(performance.now()) });
};

export const logStartupSummary = (): void => {
    if (!isPerfEnabled() || startupSummaryLogged) return;
    startupSummaryLogged = true;

    let prev = 0;
    const lines = startupMarks.map(({ name, ms }) => {
        const line = `  ${name.padEnd(28)} ${String(ms).padStart(6)} ms  (+${ms - prev} ms)`;
        prev = ms;
        return line;
    });
    logger.info(`Startup timeline (ms since process start):\n${lines.join('\n')}`);
};

// ---------- Process metrics ----------

interface TypeTotals {
    count: number;
    cpu: number;
    memMB: number;
}

let metricsTimer: NodeJS.Timeout | null = null;
let peakTotalMemMB = 0;
let peakTotalCpu = 0;

const sampleMetrics = (): void => {
    // percentCPUUsage is relative to the previous getAppMetrics() call,
    // so the very first sample reports 0% for every process.
    const metrics = app.getAppMetrics();
    const byType = new Map<string, TypeTotals>();
    let totalCpu = 0;
    let totalMemMB = 0;

    for (const m of metrics) {
        const memMB = m.memory.workingSetSize / 1024; // workingSetSize is in KB
        const cpu = m.cpu.percentCPUUsage;
        totalCpu += cpu;
        totalMemMB += memMB;

        const t = byType.get(m.type) ?? { count: 0, cpu: 0, memMB: 0 };
        t.count += 1;
        t.cpu += cpu;
        t.memMB += memMB;
        byType.set(m.type, t);
    }

    peakTotalMemMB = Math.max(peakTotalMemMB, totalMemMB);
    peakTotalCpu = Math.max(peakTotalCpu, totalCpu);

    const breakdown = [...byType.entries()]
        .map(([type, t]) => `${type}×${t.count} ${t.cpu.toFixed(1)}% ${t.memMB.toFixed(0)}MB`)
        .join(' | ');

    logger.info(
        `CPU ${totalCpu.toFixed(1)}% (peak ${peakTotalCpu.toFixed(1)}%) · ` +
        `RAM ${totalMemMB.toFixed(0)}MB (peak ${peakTotalMemMB.toFixed(0)}MB) · ${breakdown}`,
    );
};

export const startPerfMetrics = (intervalMs = DEFAULT_INTERVAL_MS): void => {
    if (!isPerfEnabled() || metricsTimer) return;
    logger.info(`Perf metrics enabled — sampling every ${Math.round(intervalMs / 1000)}s`);
    sampleMetrics(); // primes the CPU baseline
    metricsTimer = setInterval(sampleMetrics, intervalMs);
    metricsTimer.unref();
};

export const stopPerfMetrics = (): void => {
    if (!metricsTimer) return;
    clearInterval(metricsTimer);
    metricsTimer = null;
    logger.info(
        `Session peaks: CPU ${peakTotalCpu.toFixed(1)}% · RAM ${peakTotalMemMB.toFixed(0)}MB`,
    );
};
