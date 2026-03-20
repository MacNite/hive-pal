import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHiveQueenHistory } from '@/api/hooks';
import { QUEEN_STATUS_VARIANTS, getQueenDisplayName } from '@/lib/queen-utils';
import { QueenColorBadge } from '@/pages/queen/components/queen-color-badge';

export const QueenHistoryTab: React.FC<QueenHistoryTabProps> = ({ hiveId }) => {
  const { data: queens, isLoading } = useHiveQueenHistory(hiveId);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!queens || queens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Crown className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No queen history for this hive.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Queen</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Installed</TableHead>
            <TableHead>Replaced</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queens.map((queen) => {
            return (
              <TableRow key={queen.id}>
                <TableCell>
                  <Link to={`/queens/${queen.id}`} className="font-medium hover:underline">
                    {getQueenDisplayName(queen.name, queen.marking, queen.year)}
                  </Link>
                </TableCell>
                <TableCell>
                  <QueenColorBadge color={queen.color} />
                </TableCell>
                <TableCell>{queen.year ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={QUEEN_STATUS_VARIANTS[queen.status ?? 'UNKNOWN'] ?? 'outline'}>
                    {queen.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {queen.installedAt ? format(parseISO(queen.installedAt), 'PP') : '—'}
                </TableCell>
                <TableCell className="text-sm">
                  {queen.replacedAt ? format(parseISO(queen.replacedAt), 'PP') : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
