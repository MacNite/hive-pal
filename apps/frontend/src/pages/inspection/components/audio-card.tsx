import { useState, useCallback, useEffect } from 'react';
import { Mic, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from '@/components/audio';
import {
  useInspectionAudio,
  useDeleteInspectionAudio,
  getAudioDownloadUrl,
} from '@/api/hooks/useInspectionAudio';
import { useAnalyzeInspectionAudio } from '@/api/hooks/useInspectionAudioAi';

interface AudioCardProps {
  inspectionId: string;
}

interface RecordingRowProps {
  inspectionId: string;
  recording: {
    id: string;
    fileName: string;
    duration?: number | null;
  };
  getDownloadUrl: (audioId: string) => Promise<string>;
  onDelete: (audioId: string) => Promise<void>;
  isDeleting: boolean;
}

function RecordingRow({
  inspectionId,
  recording,
  getDownloadUrl,
  onDelete,
  isDeleting,
}: RecordingRowProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const analyzeMutation = useAnalyzeInspectionAudio(inspectionId, recording.id);

  useEffect(() => {
    let cancelled = false;

    const loadUrl = async () => {
      if (audioUrl || isLoadingUrl) return;

      setIsLoadingUrl(true);
      try {
        const url = await getDownloadUrl(recording.id);
        if (!cancelled) {
          setAudioUrl(url);
        }
      } catch (error) {
        console.error('Failed to get audio URL:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingUrl(false);
        }
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, isLoadingUrl, getDownloadUrl, recording.id]);

  const handleAnalyze = async () => {
    try {
      const result = await analyzeMutation.mutateAsync();

      // First working version:
      // keep it simple so you can verify backend integration.
      console.log('AI analysis result:', result);
      alert('AI analysis finished. Check the browser console for the returned JSON.');
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed. Check the browser console / network tab.');
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {audioUrl ? (
        <AudioPlayer
          src={audioUrl}
          fileName={recording.fileName}
          duration={recording.duration}
          onDelete={() => onDelete(recording.id)}
          onDownload={() => {
            window.open(audioUrl, '_blank', 'noopener,noreferrer');
          }}
          isDeleting={isDeleting}
        />
      ) : (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {isLoadingUrl ? 'Loading audio...' : 'Preparing audio...'}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending || isDeleting}
          className="gap-2"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Analyze with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function AudioCard({ inspectionId }: AudioCardProps) {
  const { data: recordings = [], isLoading } = useInspectionAudio(inspectionId);
  const deleteAudio = useDeleteInspectionAudio(inspectionId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (audioId: string) => {
      setDeletingId(audioId);
      try {
        await deleteAudio.mutateAsync(audioId);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteAudio],
  );

  const getDownloadUrl = useCallback(
    async (audioId: string) => {
      return getAudioDownloadUrl(inspectionId, audioId);
    },
    [inspectionId],
  );

  if (!isLoading && recordings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-5" />
          Audio Notes
          {recordings.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({recordings.length}{' '}
              {recordings.length === 1 ? 'recording' : 'recordings'})
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {recordings.map(recording => (
              <RecordingRow
                key={recording.id}
                inspectionId={inspectionId}
                recording={recording}
                getDownloadUrl={getDownloadUrl}
                onDelete={handleDelete}
                isDeleting={deletingId === recording.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}