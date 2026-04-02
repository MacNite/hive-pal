import { useState, useCallback, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AudioPlayer } from '@/components/audio';
import {
  useInspectionAudio,
  useDeleteInspectionAudio,
  getAudioDownloadUrl,
} from '@/api/hooks/useInspectionAudio';
import {
  useStartInspectionAudioAi,
  useInspectionAudioAiStatus,
  useInspectionAudioAiResult,
} from '@/api/hooks/useInspectionAudioAi';

interface AudioCardProps {
  inspectionId: string;
}

type RecordingAiStatus =
  | 'NONE'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

interface RecordingRowProps {
  inspectionId: string;
  recording: {
    id: string;
    fileName: string;
    duration?: number | null;
    transcriptionStatus?: RecordingAiStatus;
    transcription?: string | null;
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
  const [showAiOutput, setShowAiOutput] = useState(false);
  const [isPollingEnabled, setIsPollingEnabled] = useState(
    recording.transcriptionStatus !== undefined &&
      recording.transcriptionStatus !== 'NONE',
  );

  const startAiMutation = useStartInspectionAudioAi(inspectionId, recording.id);

  const statusQuery = useInspectionAudioAiStatus(
    inspectionId,
    recording.id,
    isPollingEnabled,
  );

  const effectiveStatus: RecordingAiStatus =
    statusQuery.data?.transcriptionStatus ??
    recording.transcriptionStatus ??
    'NONE';

  const resultQuery = useInspectionAudioAiResult(
    inspectionId,
    recording.id,
    effectiveStatus === 'COMPLETED',
  );

  const aiResult = resultQuery.data;

  const shouldShowAiPanel =
    effectiveStatus !== 'NONE' || isPollingEnabled || Boolean(aiResult);

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

  useEffect(() => {
    if (effectiveStatus === 'COMPLETED' || effectiveStatus === 'FAILED') {
      setShowAiOutput(true);
    }
  }, [effectiveStatus]);

  const handleAnalyze = async () => {
    try {
      await startAiMutation.mutateAsync();
      setIsPollingEnabled(true);
      setShowAiOutput(true);
    } catch (error) {
      console.error('AI analysis failed to start:', error);
      alert('Failed to start AI analysis.');
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
          disabled={startAiMutation.isPending || effectiveStatus === 'PROCESSING'}
        >
          {startAiMutation.isPending
            ? 'Starting...'
            : effectiveStatus === 'PROCESSING'
              ? 'Analyzing...'
              : 'Analyze using AI'}
        </Button>
      </div>

      {shouldShowAiPanel && (
        <div className="rounded-md border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">AI Output</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiOutput((prev) => !prev)}
            >
              {showAiOutput ? 'Hide' : 'Show'}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Status: {effectiveStatus}
          </div>

          {effectiveStatus === 'FAILED' && (
            <div className="text-sm text-red-600">
              AI analysis failed: {statusQuery.data?.analysisError ?? 'Unknown error'}
            </div>
          )}

          {showAiOutput && aiResult && (
            <>
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Transcript</h5>
                <div className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">
                  {aiResult.transcript?.text || 'No transcript returned.'}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">Structured JSON</h5>
                <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
                  {JSON.stringify(aiResult.inspectionDraft ?? aiResult, null, 2)}
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
            {recordings.map((recording) => (
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