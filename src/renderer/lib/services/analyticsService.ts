import { apiClient } from '../api';

export const analyticsService = {
  getDailySummary: async (dateBucket?: string): Promise<any> => {
    return apiClient.getAnalyticsSummary({ dateBucket });
  },

  getProductivityDna: async (range: '7d' | '30d' = '7d'): Promise<any> => {
    return apiClient.getProductivityDna({ range });
  },

  getContextSwitches: async (dateBucket?: string): Promise<any> => {
    return apiClient.getContextSwitches({ dateBucket });
  },
};
