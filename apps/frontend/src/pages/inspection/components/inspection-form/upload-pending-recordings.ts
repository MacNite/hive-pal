import { apiClient } from '@/api/client';

interface PendingRecording {
  id: string;
  blob: Blob;
  duration: number;
  fileName: string;
}

/**
 * Upload all pending recordings after inspection is created
 */
export async function uploadPendingRecordings(
  inspectionId: string,
  pendingRecordings: PendingRecording[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const total = pendingRecordings.length;
  let completed = 0;

  for (const recording of pendingRecordings) {
    try {
      const formData = new FormData();
      formData.append('file', recording.blob, recording.fileName);
      formData.append('fileName', recording.fileName);
      formData.append('duration', recording.duration.toString());

      await apiClient.post(`/api/inspections/${inspectionId}/audio`, formData);

      completed++;
      onProgress?.(completed, total);
    } catch (error) {
      console.error('Failed to upload recording:', recording.fileName, error);
      // Continue with other recordings
    }
  }
}
