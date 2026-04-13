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
    <div className="ml-4 flex items-center gap-2">
      <span className="text-sm text-blue-600">
        {hasConflict
          ? 'AI suggestion conflicts with existing value'
          : 'AI suggestion available'}
      </span>

      <Button type="button" variant="outline" size="sm" onClick={onAccept}>
        Accept
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}