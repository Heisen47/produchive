import { apiClient } from '../api';

export const experimentService = {
  getExperiments: async (): Promise<any> => {
    return apiClient.getExperiments();
  },

  createExperiment: async (title: string, ruleConfig: Record<string, any>, startDate: string, endDate: string): Promise<any> => {
    return apiClient.createExperiment({ title, ruleConfig, startDate, endDate });
  },
};
