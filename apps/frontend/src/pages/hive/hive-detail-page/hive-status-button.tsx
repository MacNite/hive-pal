import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HiveStatus } from '@/pages/hive/components';
import { useUpdateHive } from '@/api/hooks';
import { HiveResponse } from 'shared-schemas';

type HiveStatusEnum = HiveResponse['status'];

const ALL_STATUSES: { value: HiveStatusEnum; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DEAD', label: 'Dead' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'ARCHIVED', label: 'Archived' },
];

type HiveStatusButtonProps = {
  hiveId: string;
  status: HiveStatusEnum | undefined;
};

export const HiveStatusButton: React.FC<HiveStatusButtonProps> = ({ hiveId, status }) => {
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateHive, isPending } = useUpdateHive();

  const handleSelect = async (newStatus: HiveStatusEnum) => {
    if (newStatus === status) {
      setOpen(false);
      return;
    }
    try {
      await updateHive({ id: hiveId, data: { id: hiveId, status: newStatus } });
      toast.success(`Hive status updated to ${newStatus.toLowerCase()}`);
    } catch {
      toast.error('Failed to update hive status');
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Change hive status"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <HiveStatus status={status} />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuSeparator className="sr-only" />
        {ALL_STATUSES.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => handleSelect(value)}
            className={value === status ? 'font-semibold' : ''}
          >
            <HiveStatus status={value} />
            <span className="ml-2">{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
