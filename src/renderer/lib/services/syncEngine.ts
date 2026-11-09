import { activityService, ActivityTelemetryEvent } from './activityService';
import { websocketService } from './websocketService';
import { ACTIVITY_UPLOAD_ENABLED } from '../config';

const QUEUE_STORAGE_KEY = 'produchive_telemetry_queue';
/** Flush once this many events are waiting. */
const FLUSH_THRESHOLD = 10;
/** Most events sent in one request (keeps bodies well under the server's 100 KB JSON limit). */
const MAX_BATCH = 50;
/** Oldest events are dropped beyond this, so a server outage can't grow the queue forever. */
export const MAX_QUEUE = 500;
const FLUSH_INTERVAL_MS = 15000;

export class SyncEngine {
  private queue: ActivityTelemetryEvent[] = [];
  private isSyncing: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private batchSize = MAX_BATCH;
  /** Set when the server has no activity endpoint (404); uploads stop for this session. */
  private endpointMissing = false;
  private readonly onAck = this.handleAck.bind(this);
  private readonly onOnline = this.handleOnline.bind(this);

  /**
   * @param uploadEnabled Activity upload is off unless VITE_ENABLE_ACTIVITY_UPLOAD=true:
   * the backend has no /activity endpoint yet, and the events contain window titles and file paths.
   */
  constructor(private readonly uploadEnabled: boolean = ACTIVITY_UPLOAD_ENABLED) {
    if (uploadEnabled) {
      this.loadQueueFromStorage();
    } else {
      // Drop anything queued by older versions that uploaded unconditionally.
      try { localStorage.removeItem(QUEUE_STORAGE_KEY); } catch { /* storage unavailable */ }
    }
  }

  public start(): void {
    if (this.timer) return;

    // The shared WebSocket is also used by the AI coach and dashboard, so connect regardless.
    websocketService.connect();
    if (!this.uploadEnabled) return;

    websocketService.registerHandler('activity.ack', this.onAck);
    window.addEventListener('online', this.onOnline);

    this.timer = setInterval(() => {
      this.flushQueue();
    }, FLUSH_INTERVAL_MS);

    // Initial flush if queue has items
    this.flushQueue();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener('online', this.onOnline);
    websocketService.unregisterHandler('activity.ack', this.onAck);
  }

  public enqueueActivity(activity: Record<string, any>): void {
    if (!this.uploadEnabled) return;

    const event: ActivityTelemetryEvent = {
      eventType: 'window_changed',
      payload: {
        title: activity.title || '',
        appName: activity.owner?.name || '',
        bundleId: activity.owner?.bundleId || '',
        path: activity.owner?.path || '',
        timestamp: activity.timestamp || new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE) {
      this.queue = this.queue.slice(this.queue.length - MAX_QUEUE);
    }
    this.saveQueueToStorage();

    if (this.queue.length >= FLUSH_THRESHOLD) {
      this.flushQueue();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  /** Sends the queue in chunks of at most `batchSize`, oldest first. */
  public async flushQueue(): Promise<void> {
    if (!this.uploadEnabled || this.endpointMissing || this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      // User not logged in, maintain local queue until session exists
      return;
    }

    this.isSyncing = true;
    try {
      while (this.queue.length > 0) {
        const chunk = this.queue.slice(0, this.batchSize);
        try {
          await activityService.logBatch(chunk);
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 404) {
            // No activity endpoint on this server: stop trying until the app restarts.
            this.endpointMissing = true;
          } else if (status === 413 && this.batchSize > 1) {
            // Too large: retry with smaller chunks on the next flush.
            this.batchSize = Math.max(1, Math.floor(this.batchSize / 2));
          }
          // Offline / server error: keep the items for the next retry.
          return;
        }
        this.queue = this.queue.slice(chunk.length);
        this.saveQueueToStorage();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private handleOnline(): void {
    this.flushQueue();
  }

  private handleAck(payload: any): void {
    // Received real-time backend acknowledgment
    if (payload?.eventId) {
      this.queue = this.queue.filter((e) => e.timestamp !== payload.eventId);
      this.saveQueueToStorage();
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.queue = Array.isArray(parsed) ? parsed.slice(-MAX_QUEUE) : [];
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Ignore quota storage limits
    }
  }
}

export const syncEngine = new SyncEngine();
