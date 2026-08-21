import { apiClient } from '../api';

export const replayService = {
  getReplaySnapshots: async (dateBucket: string): Promise<any> => {
    return apiClient.getReplaySnapshots(dateBucket);
  },
};
