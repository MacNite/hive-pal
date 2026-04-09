import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePhoto } from '@/api/hooks';
import { useTranslation } from 'react-i18next';

export interface FeaturePhotoPickerRef {
  getPendingFile: () => File | null;
  clearPendingFile: () => void;
}

interface FeaturePhotoPickerProps {
  apiaryId?: string;
  hiveId?: string;
  currentPhotoUrl?: string | null;
  currentPhotoId?: string | null;
  onPhotoUploaded: (photoId: string) => void;
  onPhotoRemoved: () => void;
}

export const FeaturePhotoPicker = forwardRef<
  FeaturePhotoPickerRef,
  FeaturePhotoPickerProps
>(function FeaturePhotoPicker(
  {
    apiaryId,
    hiveId,
    currentPhotoUrl,
    onPhotoUploaded,
    onPhotoRemoved,
  },
  ref,
) {
  const { t } = useTranslation('common');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPhoto = useCreatePhoto();

  useImperativeHandle(ref, () => ({
    getPendingFile: () => pendingFile,
    clearPendingFile: () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setPendingFile(null);
    },
  }));

  const displayUrl = previewUrl || currentPhotoUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (apiaryId) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('apiaryId', apiaryId);
        if (hiveId) formData.append('hiveId', hiveId);
        formData.append('caption', 'Feature photo');
        formData.append('date', new Date().toISOString());

        const result = await createPhoto.mutateAsync(formData);
        onPhotoUploaded(result.id);
        setPendingFile(null);
      } catch {
        toast.error(
          t('photo.uploadFailed', { defaultValue: 'Failed to upload photo' }),
        );
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }
    } else {
      setPendingFile(file);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPendingFile(null);
    onPhotoRemoved();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {t('photo.featurePhoto', { defaultValue: 'Feature Photo' })}{' '}
        <span className="text-muted-foreground font-normal">
          ({t('photo.optional', { defaultValue: 'optional' })})
        </span>
      </label>

      {displayUrl ? (
        <div className="relative group">
          <img
            src={displayUrl}
            alt="Feature photo"
            className="w-full h-40 object-cover rounded-md border"
          />
          {createPhoto.isPending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-24 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={createPhoto.isPending}
          >
            <div className="flex flex-col items-center gap-1">
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('photo.selectPhoto', { defaultValue: 'Select a photo' })}
              </span>
            </div>
          </Button>
        </>
      )}
    </div>
  );
});
