import { apiClient } from '../api';

export const goalService = {
  getGoals: async (): Promise<any> => {
    return apiClient.getBackendGoals();
  },

  createGoal: async (title: string, targetMinutes: number, deadline?: string): Promise<any> => {
    return apiClient.createBackendGoal({ title, targetMinutes, deadline });
  },

  getForecast: async (goalId: string): Promise<any> => {
    return apiClient.getGoalForecast(goalId);
  },
};
