import { apiClient } from '../api';

export const reportService = {
  getWeeklyReports: async (): Promise<any> => {
    return apiClient.getWeeklyReports();
  },

  getReportById: async (id: string): Promise<any> => {
    return apiClient.getWeeklyReportById(id);
  },
};
