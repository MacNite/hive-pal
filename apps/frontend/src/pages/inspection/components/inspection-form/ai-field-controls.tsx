import { Button } from '@/components/ui/button';

type Props = {
  isVisible: boolean;
  hasConflict?: boolean;
  status?: 'pending' | 'accepted' | 'dismissed';
  onAccept: () => void;
  onDismiss: () => void;
};

export function AiFieldControls({
  isVisible,
  hasConflict = false,
  status = 'pending',
  onAccept,
  onDismiss,
}: Props) {
  if (!isVisible || status !== 'pending') return null;

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className={hasConflict ? 'text-amber-600' : 'text-blue-600'}>
        {hasConflict ? 'AI suggestion conflicts with existing value' : 'AI suggestion available'}
      </span>

      <Button type="button" size="sm" variant="secondary" onClick={onAccept}>
        Accept
      </Button>

      <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}