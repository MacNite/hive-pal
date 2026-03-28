import { HiveList } from '@/pages/hive/components';
import {
  MainContent,
  PageAside,
  PageGrid,
} from '@/components/layout/page-grid-layout';
import { HomeActionSidebar } from '@/components/home-action-sidebar';
import { HiveMinimap } from '@/components/hive-minimap';
import { ApiaryHeader } from '@/components/apiary-header';
import { ApiaryTimeline } from '@/components/apiary-timeline';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useApiaries, useHives } from '@/api/hooks';
import { useApiary } from '@/hooks/use-apiary';

export const HomePage = () => {
  const { data, isLoading, refetch } = useHives();
  const { activeApiaryId, apiaries } = useApiary();
  const { pendingMemberships } = useApiaries();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // User has no apiaries but has pending join requests
  if ((!apiaries || apiaries.length === 0) && pendingMemberships > 0) {
    return (
      <PageGrid>
        <MainContent>
          <Card>
            <CardContent className="flex items-center gap-4 py-8">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Waiting for approval</h2>
                <p className="text-muted-foreground">
                  You&apos;ve requested to join{' '}
                  {pendingMemberships === 1
                    ? 'an apiary'
                    : `${pendingMemberships} apiaries`}
                  . The owner will review your request shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        </MainContent>
      </PageGrid>
    );
  }

  return (
    <PageGrid>
      <MainContent>
        <div className="space-y-6">
          <ApiaryHeader />
          {activeApiaryId && (
            <HiveMinimap apiaryId={activeApiaryId} className="mb-6" />
          )}
          <HiveList hives={data ?? []} />
          <ApiaryTimeline />
        </div>
      </MainContent>
      <PageAside>
        <HomeActionSidebar onRefreshData={refetch} />
      </PageAside>
    </PageGrid>
  );
};
