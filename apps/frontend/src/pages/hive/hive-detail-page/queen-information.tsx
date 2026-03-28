import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { BeeIcon } from '@/components/common/bee-icon.tsx';
import { CalendarDays, MoreHorizontal } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { buttonVariants } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActiveQueen, QueenResponse } from 'shared-schemas';
import { useState } from 'react';
import { QueenTransferDialog } from '@/pages/queen/components/queen-transfer-dialog';
import { getQueenColorClass } from '@/lib/queen-utils';
import { useUpdateQueen } from '@/api/hooks';

type QueenInformationProps = {
  hiveId?: string;
  activeQueen?: ActiveQueen | null;
  onQueenUpdated?: () => void;
  variant?: 'card' | 'inline';
};
export const QueenInformation: React.FC<QueenInformationProps> = ({
  activeQueen,
  hiveId,
  onQueenUpdated,
  variant = 'card',
}) => {
  const { t } = useTranslation('queen');
  const navigate = useNavigate();
  const [transferOpen, setTransferOpen] = useState(false);
  const { mutateAsync: updateQueen } = useUpdateQueen();

  const handleMarkQueenState = async (newState: 'DEAD' | 'REPLACED') => {
    if (!activeQueen?.id) return;
    await updateQueen({
      id: activeQueen.id,
      data: {
        status: newState,
        replacedAt: new Date().toISOString(),
      },
    });
    onQueenUpdated?.();
  };

  const handleReplaceQueen = () => {
    navigate(`/hives/${hiveId}/queens/create`);
  };

  const queenActionsMenu = activeQueen ? (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground cursor-pointer" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => navigate(`/queens/${activeQueen.id}`)}>
          {t('actions.viewDetails')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTransferOpen(true)}>
          {t('actions.transferQueen')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/queens/${activeQueen.id}/edit`)}>
          {t('actions.editQueen')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleReplaceQueen}>
          {t('actions.replaceQueen')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMarkQueenState('DEAD')}>
          {t('actions.markAsDead')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleMarkQueenState('REPLACED')}>
          {t('actions.markAsLostMissing')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  const mobileView = (
    <div className="sm:hidden">
      {activeQueen ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-4 w-4 rounded-full border border-gray-600 ${getQueenColorClass(activeQueen?.color, 'bg-white')}`}
            />
            <Link to={`/queens/${activeQueen.id}`} className="text-sm font-medium hover:underline">
              {activeQueen?.marking} • {activeQueen?.year}
            </Link>
            {activeQueen?.installedAt && (
              <span className="text-xs text-muted-foreground">
                {format(
                  typeof activeQueen.installedAt === 'string'
                    ? parseISO(activeQueen.installedAt)
                    : activeQueen.installedAt,
                  'PPP',
                )}
              </span>
            )}
          </div>
          {queenActionsMenu}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('information.noActiveQueen')}
          </span>
          <Link
            to={`/hives/${hiveId}/queens/create`}
            className={buttonVariants({
              size: 'sm',
              variant: 'ghost',
            })}
          >
            <BeeIcon className="mr-2 h-4 w-4" /> {t('actions.addQueen')}
          </Link>
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div>
        {mobileView}
        <div className="hidden sm:flex items-center gap-3">
          {activeQueen ? (
            <>
              <div
                className={`h-4 w-4 rounded-full border border-gray-600 ${getQueenColorClass(activeQueen?.color, 'bg-white')}`}
              />
              <Link to={`/queens/${activeQueen.id}`} className="text-sm font-medium hover:underline">
                {activeQueen?.marking}
              </Link>
              <span className="text-xs text-muted-foreground">{activeQueen?.year}</span>
              {activeQueen?.installedAt && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(
                      typeof activeQueen.installedAt === 'string'
                        ? parseISO(activeQueen.installedAt)
                        : activeQueen.installedAt,
                      'PPP',
                    )}
                  </span>
                </>
              )}
              {queenActionsMenu}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('information.noActiveQueen')}
              </span>
              <Link
                to={`/hives/${hiveId}/queens/create`}
                className={buttonVariants({
                  size: 'sm',
                  variant: 'ghost',
                })}
              >
                <BeeIcon className="mr-2 h-4 w-4" /> {t('actions.addQueen')}
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-3 sm:p-0">
      {/* Mobile compact view */}
      <div className="sm:hidden">
        {activeQueen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-4 w-4 rounded-full border border-gray-600 ${getQueenColorClass(activeQueen?.color, 'bg-white')}`}
              />
              <span className="text-sm font-medium">
                {activeQueen?.marking} • {activeQueen?.year}
              </span>
              {activeQueen?.installedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(
                    typeof activeQueen.installedAt === 'string'
                      ? parseISO(activeQueen.installedAt)
                      : activeQueen.installedAt,
                    'PPP',
                  )}
                </span>
              )}
            </div>
            {activeQueen && queenActionsMenu}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('information.noActiveQueen')}
            </span>
            <Link
              to={`/hives/${hiveId}/queens/create`}
              className={buttonVariants({
                size: 'sm',
                variant: 'ghost',
              })}
            >
              <BeeIcon className="mr-2 h-4 w-4" /> {t('actions.addQueen')}
            </Link>
          </div>
        )}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-3">
            <div
              className={`h-5 w-5 rounded-full border border-gray-600 ${getQueenColorClass(activeQueen?.color, 'bg-white')}`}
            />
            {t('singular')} {activeQueen?.marking}
          </CardTitle>

          <div className="flex items-center space-x-2">
            <BeeIcon className="h-4 w-4 text-muted-foreground" />
            {activeQueen && queenActionsMenu}
          </div>
        </CardHeader>
        <CardContent>
          {activeQueen ? (
            <div className="space-y-2">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {activeQueen?.installedAt && (
                    <span>
                      {t('fields.installedOn', {
                        date: format(
                          typeof activeQueen.installedAt === 'string'
                            ? parseISO(activeQueen.installedAt)
                            : activeQueen.installedAt,
                          'PPP',
                        ),
                      })}
                    </span>
                  )}
                  {activeQueen?.source && (
                    <span className="text-muted-foreground">
                      ({t('fields.via', { source: activeQueen.source })})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-muted-foreground mb-4">
                {t('information.noActiveQueen')}
              </p>
              <Link
                to={`/hives/${hiveId}/queens/create`}
                className={buttonVariants({
                  size: 'sm',
                })}
              >
                <BeeIcon className="mr-2 h-4 w-4" /> {t('actions.addQueen')}
              </Link>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <span>{activeQueen?.year}</span>
          <div className="flex gap-1 items-center">-</div>
        </CardFooter>
      </div>

      {activeQueen && (
        <QueenTransferDialog
          queen={activeQueen as QueenResponse}
          open={transferOpen}
          onOpenChange={setTransferOpen}
        />
      )}
    </Card>
  );
};
