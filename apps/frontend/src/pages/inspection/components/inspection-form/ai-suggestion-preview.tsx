import { Button } from '@/components/ui/button';

type Props = {
  label?: string;
  currentValue: React.ReactNode;
  suggestedValue: React.ReactNode;
  hasConflict?: boolean;
  status?: 'pending' | 'accepted' | 'dismissed';
  onAccept: () => void;
  onDismiss: () => void;
};

export function AiSuggestionPreview({
  label,
  currentValue,
  suggestedValue,
  hasConflict = false,
  status = 'pending',
  onAccept,
  onDismiss,
}: Props) {
  if (status !== 'pending') return null;

  return (
    <div className="mt-2 rounded-md border border-muted bg-muted/30 p-3">
      {label && (
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div>
          <div className="text-xs text-muted-foreground">Current</div>
          <div className="text-sm font-medium">
            {currentValue || <span className="italic text-muted-foreground">Empty</span>}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">→</div>

        <div>
          <div className="text-xs text-muted-foreground">AI</div>
          <div className="text-sm font-medium">
            {suggestedValue || <span className="italic text-muted-foreground">Empty</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className={hasConflict ? 'text-xs text-amber-600' : 'text-xs text-blue-600'}>
          {hasConflict ? 'Conflicts with existing value' : 'Will fill this field'}
        </span>

        <Button type="button" size="sm" variant="secondary" onClick={onAccept}>
          Accept
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}