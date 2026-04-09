import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Droplet,
  TrendingUp,
  PieChart,
  MapPin,
  FileBarChart,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiaryStore } from '@/hooks/use-apiary';
import { useApiaryStatistics } from '@/api/hooks/useReports';
import { useApiary } from '@/api/hooks';

export const ReportsSummaryWidget = () => {
  const { t } = useTranslation(['common']);
  const { activeApiaryId } = useApiaryStore();
  const { data: statistics, isLoading } = useApiaryStatistics(
    activeApiaryId ?? undefined,
    'ytd',
  );
  const { data: apiary } = useApiary(activeApiaryId ?? '', {
    enabled: !!activeApiaryId,
  });

  if (isLoading) {
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
    <Card className="h-full flex flex-col overflow-hidden gap-0 py-0 border-none shadow-none">
      {apiary?.featurePhotoUrl && (
        <img
          src={apiary.featurePhotoUrl}
          alt={`${apiary.name} feature photo`}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          {t('reports.widget.title')}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/apiaries/${activeApiaryId}`}>
              <MapPin className="h-4 w-4" />
              {t('reports.widget.apiaryDetails')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/reports">
              <FileBarChart className="h-4 w-4" />
              {t('reports.widget.viewReports')}
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
    </Card>
  );
};
