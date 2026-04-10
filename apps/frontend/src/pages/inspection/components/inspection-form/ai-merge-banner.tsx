import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  pendingCount: number;
  conflictCount: number;
  onAcceptAll: () => void;
  onDismissAll: () => void;
};

export function AiMergeBanner({
  pendingCount,
  conflictCount,
  onAcceptAll,
  onDismissAll,
}: Props) {
  if (pendingCount === 0) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
      <AlertDescription className="space-y-3">
        <div>
          <div className="font-medium">AI suggestions available</div>
          <div className="text-sm opacity-80">
            {pendingCount} pending suggestion{pendingCount === 1 ? '' : 's'}
            {conflictCount > 0 ? `, ${conflictCount} with existing values` : ''}.
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={onAcceptAll}>
            Accept all
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDismissAll}>
            Dismiss all
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}