import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  pendingCount: number;
  conflictCount: number;
  onAcceptAllSafe: () => void;
  onReviewConflicts: () => void;
  onDismissAll: () => void;
};

export function AiMergeBanner({
  pendingCount,
  conflictCount,
  onAcceptAllSafe,
  onReviewConflicts,
  onDismissAll,
}: Props) {
  if (pendingCount === 0) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertDescription className="space-y-3">
        <div>
          <div className="font-medium">AI suggestions available</div>
          <div className="text-sm opacity-80">
            {pendingCount} pending suggestion{pendingCount === 1 ? '' : 's'}
            {conflictCount > 0 ? `, ${conflictCount} conflict${conflictCount === 1 ? '' : 's'}` : ''}.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onAcceptAllSafe}>
            Accept all safe
          </Button>

          {conflictCount > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={onReviewConflicts}>
              Review conflicts
            </Button>
          )}

          <Button type="button" size="sm" variant="ghost" onClick={onDismissAll}>
            Dismiss all
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}