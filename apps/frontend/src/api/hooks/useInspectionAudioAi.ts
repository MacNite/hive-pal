import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useAnalyzeInspectionAudio = (
  inspectionId: string,
  audioId: string,
) => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        `/api/inspections/${inspectionId}/audio/${audioId}/ai/analyze`,
      );
      return response.data;
    },
  });
};