import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BarChart,
  CalendarDays,
  Clock,
  Droplet,
  FileBarChart,
  MapPin,
  PieChart,
  TrendingUp,
  MoreVertical,
  CheckCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiaryStore } from '@/hooks/use-apiary';
import { useApiaryStatistics } from '@/api/hooks/useReports';
import { useApiary, useHives } from '@/api/hooks';
import { useImageDisplayStore } from '@/stores/image-display-store';
import {
  useOverdueInspections,
  useDueTodayInspections,
  useUpcomingInspections,
  useUpdateInspection,
} from '@/api/hooks/useInspections';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RescheduleDialog } from '@/pages/inspection/components/reschedule-dialog';
import { format } from 'date-fns';
import { InspectionResponse, InspectionStatus } from 'shared-schemas';

export const ApiaryHeader: React.FC = () => {
  const { t } = useTranslation(['common', 'inspection']);
  const navigate = useNavigate();
  const { activeApiaryId } = useApiaryStore();
  const { data: statistics, isLoading: statsLoading } = useApiaryStatistics(
    activeApiaryId ?? undefined,
    'ytd',
  );
  const { data: apiary } = useApiary(activeApiaryId ?? '', {
    enabled: !!activeApiaryId,
  });
  const { data: hives } = useHives();

  const { mode: imageMode } = useImageDisplayStore();

  const { data: overdueInspections, isLoading: overdueLoading } =
    useOverdueInspections();
  const { data: dueTodayInspections, isLoading: dueTodayLoading } =
    useDueTodayInspections();
  const { data: upcomingInspections, isLoading: upcomingLoading } =
    useUpcomingInspections(5);

  const hiveNameMap = useMemo(() => {
    if (!hives) return new Map<string, string>();
    return new Map(hives.map(hive => [hive.id, hive.name]));
  }, [hives]);

  const getHiveName = (hiveId: string) => hiveNameMap.get(hiveId) || hiveId;

  const [reschedulingInspection, setReschedulingInspection] =
    useState<InspectionResponse | null>(null);
  const { mutate: updateInspection } = useUpdateInspection();

  const handleDoInspection = (inspection: InspectionResponse) => {
    navigate(`/inspections/${inspection.id}/edit?from=scheduled`);
  };

  const handleReschedule = (newDate: Date, isAllDay: boolean) => {
    if (!reschedulingInspection) return;
    updateInspection(
      {
        id: reschedulingInspection.id,
        data: { date: newDate.toISOString(), isAllDay, status: InspectionStatus.SCHEDULED },
      },
      { onSuccess: () => setReschedulingInspection(null) },
    );
  };

  const overdueCount= overdueInspections?.length ?? 0;
  const dueTodayCount = dueTodayInspections?.length ?? 0;
  const upcomingCount = upcomingInspections?.length ?? 0;
  const inspectionsLoading = overdueLoading || dueTodayLoading || upcomingLoading;
  const hasInspections = overdueCount > 0 || dueTodayCount > 0 || upcomingCount > 0;

  const handleViewOverdue = () => {
    navigate('/inspections?status=OVERDUE');
  };

  const handleViewDueToday = () => {
    navigate(
      '/inspections?status=SCHEDULED&date=' +
        new Date().toISOString().split('T')[0],
    );
  };

  if (statsLoading) {
    return (
      <Card className="h-full gap-0 py-0">
        <div className="px-4 pt-3 pb-1">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  if (!activeApiaryId) {
    return (
      <Card className="h-full gap-0 py-0">
        <div className="px-4 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            {t('reports.widget.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('reports.widget.noApiary')}
          </p>
        </div>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  const getScoreColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'text-muted-foreground';
    if (value >= 6) return 'text-green-600';
    if (value >= 3) return 'text-amber-500';
    return 'text-red-500';
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <>
    <Card className={`h-full flex overflow-hidden gap-0 py-0 border-none shadow-none ${imageMode === 'side' && apiary?.featurePhotoUrl ? 'flex-col sm:flex-row' : 'flex-col'}`}>
      {imageMode !== 'hidden' && apiary?.featurePhotoUrl && (
        <img
          src={apiary.featurePhotoUrl}
          alt={`${apiary.name} feature photo`}
          className={imageMode === 'side'
            ? 'w-full sm:w-[140px] h-32 sm:h-auto object-cover flex-shrink-0'
            : 'w-full h-32 object-cover'}
        />
      )}
      <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {apiary?.name ?? t('reports.widget.title')}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/apiaries/${activeApiaryId}`} aria-label={t('reports.widget.apiaryDetails')}>
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reports.widget.apiaryDetails')}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports" aria-label={t('reports.widget.viewReports')}>
              <FileBarChart className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reports.widget.viewReports')}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/calendar" aria-label={t('inspection:dashboard.viewCalendar', 'Calendar')}>
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{t('inspection:dashboard.viewCalendar', 'Calendar')}</span>
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-3">
        <div>
          <div className="flex items-center gap-1">
            <Droplet className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {t('reports.honeyProduction')}
            </span>
          </div>
          <div className="text-xl font-bold">
            {formatNumber(statistics.honeyProduction.totalAmount)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              {statistics.honeyProduction.unit}
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <BarChart className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-muted-foreground">
              {t('reports.healthScores')}
            </span>
          </div>
          <div
            className={`text-xl font-bold ${getScoreColor(statistics.healthScores.averageOverall)}`}
          >
            {statistics.healthScores.averageOverall
              ? formatNumber(statistics.healthScores.averageOverall)
              : '—'}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / 10
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
            <span className="text-xs text-muted-foreground">
              {t('reports.feedingTotals')}
            </span>
          </div>
          <div className="text-xl font-bold">
            {formatNumber(statistics.feedingTotals.totalSugarKg)}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              kg
            </span>
          </div>
        </div>
      </div>

      {/* Inspection Status */}
      {!inspectionsLoading && hasInspections && (
        <div className="px-4 pb-3 space-y-2">
          {(overdueCount > 0 || dueTodayCount > 0) && (
            <div className="flex items-center gap-4">
              {overdueCount > 0 && (
                <div
                  className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 cursor-pointer"
                  onClick={handleViewOverdue}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {overdueCount} {t('inspection:dashboard.overdue', 'overdue')}
                  </span>
                </div>
              )}
              {dueTodayCount > 0 && (
                <div
                  className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 cursor-pointer"
                  onClick={handleViewDueToday}
                >
                  <Clock className="h-4 w-4" />
                  <span>
                    {dueTodayCount}{' '}
                    {t('inspection:dashboard.dueToday', 'due today')}
                  </span>
                </div>
              )}
            </div>
          )}

          {upcomingCount > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('inspection:dashboard.upcoming', 'Upcoming')}
              </h4>
              <div className="space-y-2">
                {upcomingInspections?.map(inspection => (
                  <div
                    key={inspection.id}
                    className="flex items-start justify-between gap-2 text-sm p-2 rounded-md bg-blue-50 border border-blue-100"
                  >
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{format(new Date(inspection.date), 'MMM d')}</span>
                        {!inspection.isAllDay && <span>{format(new Date(inspection.date), 'HH:mm')}</span>}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {t('inspection:status.pending', 'Scheduled')}
                        </span>
                      </div>
                      <span className="font-medium text-blue-700">
                        {t('common:timeline.inspectHive', { hiveName: getHiveName(inspection.hiveId) })}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mr-1">
                          <MoreVertical className="h-3 w-3" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleDoInspection(inspection)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t('common:timeline.doInspection')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setReschedulingInspection(inspection)}>
                          <CalendarDays className="h-4 w-4 mr-2" />
                          {t('common:timeline.reschedule')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </Card>

    {reschedulingInspection && (
      <RescheduleDialog
        open={!!reschedulingInspection}
        onOpenChange={open => !open && setReschedulingInspection(null)}
        inspection={reschedulingInspection}
        hiveName={getHiveName(reschedulingInspection.hiveId)}
        onReschedule={handleReschedule}
      />
    )}
    </>
  );
};
