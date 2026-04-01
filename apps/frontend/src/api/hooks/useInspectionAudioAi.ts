import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export const useStartInspectionAudioAi = (
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

export const useInspectionAudioAiStatus = (
  inspectionId: string,
  audioId: string,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ['inspection-audio-ai-status', inspectionId, audioId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/inspections/${inspectionId}/audio/${audioId}/ai/status`,
      );
      return response.data;
    },
    enabled,
    refetchInterval: query => {
      const status = query.state.data?.transcriptionStatus;
      return status === 'PENDING' || status === 'PROCESSING' ? 3000 : false;
    },
  });
};

export const useInspectionAudioAiResult = (
  inspectionId: string,
  audioId: string,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ['inspection-audio-ai-result', inspectionId, audioId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/inspections/${inspectionId}/audio/${audioId}/ai/result`,
      );
      return response.data;
    },
    enabled,
  });
};