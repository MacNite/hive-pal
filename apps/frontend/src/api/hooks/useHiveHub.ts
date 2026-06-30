import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export type HiveHubFirmwareTarget = 'hivehub' | 'hivescale' | 'beecounter' | 'hiveinside';

export interface HiveHubFirmwareUploadInput {
  file: File;
  version: string;
  target?: HiveHubFirmwareTarget;
  active?: boolean;
}

export interface HiveHubAutoQueuedUpdate {
  slot: 1 | 2;
  status: 'queued' | 'failed';
  command_id?: number;
  error?: string;
}

export interface HiveHubFirmwareUploadResult {
  status: string;
  version: string;
  filename: string;
  target: HiveHubFirmwareTarget;
  active: boolean;
  size_bytes: number;
  crc32: number;
  auto_queued_updates?: HiveHubAutoQueuedUpdate[];
}

export const useUploadHiveHubFirmware = (deviceId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<
    HiveHubFirmwareUploadResult,
    Error,
    HiveHubFirmwareUploadInput
  >({
    mutationFn: async ({ file, version, target = 'hivehub', active = true }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version);
      formData.append('target', target);
      formData.append('active', String(active));

      const response = await apiClient.post<HiveHubFirmwareUploadResult>(
        `/api/hivescale/devices/${deviceId}/firmware`,
        formData,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hivescale', 'devices'] });
    },
  });
};
