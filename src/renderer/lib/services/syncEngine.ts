import { activityService, ActivityTelemetryEvent } from './activityService';
import { websocketService } from './websocketService';

const QUEUE_STORAGE_KEY = 'produchive_telemetry_queue';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 15000;

class SyncEngine {
  private queue: ActivityTelemetryEvent[] = [];
  private isSyncing: boolean = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadQueueFromStorage();
  }

  public start(): void {
    if (this.timer) return;

    // Connect WebSocket
    websocketService.connect();
    websocketService.registerHandler('activity.ack', this.handleAck.bind(this));

    // Monitor online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));

    // Start periodic flush loop
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
    window.removeEventListener('online', this.handleOnline.bind(this));
    websocketService.unregisterHandler('activity.ack', this.handleAck.bind(this));
  }

  public enqueueActivity(activity: Record<string, any>): void {
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
    this.saveQueueToStorage();

    if (this.queue.length >= BATCH_SIZE) {
      this.flushQueue();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  private async flushQueue(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    const token = sessionStorage.getItem('token');
    if (!token) {
      // User not logged in, maintain local queue until session exists
      return;
    }

    this.isSyncing = true;
    const batchToSend = [...this.queue];

    try {
      await activityService.logBatch(batchToSend);
      // Remove successfully sent batch
      this.queue = this.queue.slice(batchToSend.length);
      this.saveQueueToStorage();
    } catch (error) {
      // Sync failed (offline or network error) -> keep items in queue for next retry
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
        this.queue = JSON.parse(stored);
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
