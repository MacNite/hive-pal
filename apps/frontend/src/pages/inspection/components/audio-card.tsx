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
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [showAiOutput, setShowAiOutput] = useState(false);

  const analyzeMutation = useAnalyzeInspectionAudio(inspectionId, recording.id);

  useEffect(() => {
    let cancelled = false;

    const loadUrl = async () => {
      if (audioUrl) return;
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

    void loadUrl();

    return () => {
      cancelled = true;
    };
  }, [audioUrl, getDownloadUrl, recording.id]);

  const handleAnalyze = async () => {
    try {
      const result = await analyzeMutation.mutateAsync();
      console.log('AI analysis result:', result);
      setAiResult(result);
      setShowAiOutput(true);
    } catch (error) {
      console.error('AI analysis failed:', error);
      alert('AI analysis failed. Check the browser console / network tab.');
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      {audioUrl ? (
        <AudioPlayer
          src={audioUrl}
          fileName={recording.fileName}
          duration={recording.duration ?? undefined}
          onDelete={() => onDelete(recording.id)}
          onDownload={() => {
            window.open(audioUrl, '_blank', 'noopener,noreferrer');
          }}
          isDeleting={isDeleting}
        />
      ) : (
        <div className="text-sm text-muted-foreground">
          {isLoadingUrl ? 'Loading audio...' : 'Preparing audio...'}
        </div>
      )}

      <div>
        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending}
        >
          {analyzeMutation.isPending ? 'Analyzing...' : 'Create Inspection from Audio (AI)'}
        </Button>
      </div>

      {aiResult && (
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">AI Output</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiOutput(prev => !prev)}
            >
              {showAiOutput ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showAiOutput && (
            <>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Transcript</h5>
                <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
                  {aiResult?.transcript?.text || 'No transcript returned.'}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">Structured JSON</h5>
                <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                  {JSON.stringify(aiResult?.inspectionDraft ?? aiResult, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
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