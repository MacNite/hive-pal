import { HiveStatus } from './hive-status';
import { Activity, TrendingUp } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { ViewDetailsLink } from '@/components/ui/view-details-link';
import { HiveResponse } from 'shared-schemas';
import { AlertsPopover } from '@/components/alerts';
import { useHive } from '@/api/hooks/useHives';
import { useActions } from '@/api/hooks/useActions';
import {
  calculateFeedingTotals,
  isWithinFeedingWindow,
} from '@/utils/feeding-calculations';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { buildBoxGradient } from '@/utils/box-gradient';

type HiveListProps = {
  hives: HiveResponse[];
};

const HiveCard: React.FC<{ hive: HiveResponse }> = ({ hive }) => {
  const { t } = useTranslation(['hive']);
  const { data: hiveDetails } = useHive(hive.id, { staleTime: 5 * 60 * 1000 });
  const { data: actions } = useActions(
    { hiveId: hive.id },
    { staleTime: 5 * 60 * 1000 },
  );

  const feedingInfo = useMemo(() => {
    if (!actions) return null;

    // Use settings if available, otherwise the utility functions will use defaults
    const settings = hiveDetails?.settings || undefined;
    const isInWindow = isWithinFeedingWindow(settings);
    if (!isInWindow) return null;

    const totals = calculateFeedingTotals(actions, settings);
    const optimalAmount = settings?.autumnFeeding?.amountKg ?? 12;

    return {
      fed: totals.autumnSugarKg,
      optimal: optimalAmount,
      percentage: Math.round((totals.autumnSugarKg / optimalAmount) * 100),
    };
  }, [actions, hiveDetails?.settings]);

  const formatLastInspectionDate = (dateString?: string) => {
    if (!dateString) return t('hive:card.noInspection');
    const date = new Date(dateString);
    return t('hive:card.lastInspected', { date: date.toLocaleDateString() });
  };

  const featurePhotoUrl = hive.featurePhotoUrl || hiveDetails?.featurePhotoUrl;

  return (
    <Card className="overflow-hidden gap-0 py-0">
      {/* Feature photo banner or gradient fallback */}
      {featurePhotoUrl ? (
        <img
          src={featurePhotoUrl}
          alt={`${hive.name} feature photo`}
          className="w-full h-32 object-cover"
        />
      ) : (
        <div
          className="w-full h-32 opacity-60"
          style={{ background: buildBoxGradient(hiveDetails?.boxes) }}
        />
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3">
        {/* Row 1: Name + Status/Score */}
        <div className="min-w-0">
          <CardTitle className="truncate">{hive.name}</CardTitle>
          <p className="text-xs text-gray-500">
            {formatLastInspectionDate(hive.lastInspectionDate)}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          {hiveDetails?.hiveScore?.overallScore !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {hiveDetails.hiveScore.overallScore}/100
              </span>
            </div>
          )}
          <HiveStatus status={hive.status} />
        </div>

        {/* Row 2: Notes + Feeding */}
        <p className="text-xs/5 text-gray-400 truncate">
          {hive.notes ?? t('hive:fields.noNotes')}
        </p>
        {feedingInfo ? (
          <div className="flex items-center justify-end gap-1 text-sm">
            <Activity className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="font-medium">
              {feedingInfo.fed.toFixed(1)}/{feedingInfo.optimal}kg
            </span>
            <span className="text-xs text-gray-500">
              ({feedingInfo.percentage}%)
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Row 3: Alerts + Details link */}
        <AlertsPopover alerts={hive.alerts || []} />
        <div className="flex justify-end items-center">
          <ViewDetailsLink to={`/hives/${hive.id}`}>
            {t('hive:card.showDetails', 'Show details')}
          </ViewDetailsLink>
        </div>
      </div>
    </Card>
  );
};

export const HiveList: React.FC<HiveListProps> = ({ hives }) => {
  return (
    <div>
      <div className={'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
        {hives.map(hive => (
          <HiveCard key={hive.id} hive={hive} />
        ))}
      </div>
    </div>
  );
};
