import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  summary: string;
  currentValue: React.ReactNode;
  suggestedValue: React.ReactNode;
  hasConflict?: boolean;
  status?: 'pending' | 'accepted' | 'dismissed';
  onAccept: () => void;
  onDismiss: () => void;
};

export function AiSectionPreview({
  title,
  summary,
  currentValue,
  suggestedValue,
  hasConflict = false,
  status = 'pending',
  onAccept,
  onDismiss,
}: Props) {
  const [open, setOpen] = useState(false);

  if (status !== 'pending') return null;

  return (
    <div className="mt-3 rounded-md border border-muted bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{summary}</div>
          <div className={hasConflict ? 'mt-1 text-xs text-amber-600' : 'mt-1 text-xs text-blue-600'}>
            {hasConflict ? 'Contains values that would overwrite existing content' : 'Contains AI-suggested content'}
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(v => !v)}
        >
          {open ? 'Hide preview' : 'Review'}
        </Button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Current</div>
            <div className="min-h-20 rounded border bg-background p-2 text-sm">
              {currentValue || <span className="italic text-muted-foreground">Empty</span>}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">AI</div>
            <div className="min-h-20 rounded border bg-background p-2 text-sm">
              {suggestedValue || <span className="italic text-muted-foreground">Empty</span>}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
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