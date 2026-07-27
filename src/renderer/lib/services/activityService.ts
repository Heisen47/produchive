import { apiClient } from '../api';

export interface ActivityTelemetryEvent {
  eventType: string;
  payload: Record<string, any>;
  timestamp: string;
}

export const activityService = {
  logEvent: async (eventType: string, payload: Record<string, any>): Promise<any> => {
    return apiClient.logActivityEvent({
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    });
  },

  logBatch: async (events: ActivityTelemetryEvent[]): Promise<any> => {
    if (events.length === 0) return;
    return apiClient.logActivityBatch({ events });
  },
};
