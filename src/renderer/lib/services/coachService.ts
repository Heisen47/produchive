import { apiClient } from '../api';

export const coachService = {
  getInsights: async (): Promise<any> => {
    return apiClient.getCoachInsights();
  },

  generateRecommendation: async (context?: Record<string, any>): Promise<any> => {
    return apiClient.generateCoachRecommendation({ context });
  },
};
