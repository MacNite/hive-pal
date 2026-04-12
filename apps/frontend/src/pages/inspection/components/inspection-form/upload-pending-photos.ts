import { apiClient } from '@/api/client';

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption?: string;
}

/**
 * Upload all pending photos after inspection is created
 */
export async function uploadPendingPhotos(
  inspectionId: string,
  pendingPhotos: PendingPhoto[],
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const total = pendingPhotos.length;
  let completed = 0;

  for (const photo of pendingPhotos) {
    try {
      const formData = new FormData();
      formData.append('file', photo.file, photo.file.name);
      formData.append('fileName', photo.file.name);
      if (photo.caption) {
        formData.append('caption', photo.caption);
      }

      await apiClient.post(`/api/inspections/${inspectionId}/photos`, formData);

      completed++;
      onProgress?.(completed, total);
    } catch (error) {
      console.error('Failed to upload photo:', photo.file.name, error);
      // Continue with other photos
    }
  }
}
