import { InspectionForm } from '@/pages/inspection/components/inspection-form';
import type { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInspection } from '@/api/hooks/useInspections';
import { format, parseISO } from 'date-fns';

type EditInspectionLocationState = {
  aiDraft?: Partial<InspectionFormData>;
  aiSuggestedFields?: string[];
  aiSourceAudioId?: string;
};

export const EditInspectionPage = () => {
  const { t } = useTranslation('inspection');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromScheduled = searchParams.get('from') === 'scheduled';
  const state = (location.state ?? {}) as EditInspectionLocationState;

  const { data: inspection } = useInspection(id || '', {
    enabled: !!id && fromScheduled,
  });

  return (
    <div className="space-y-4">
      {fromScheduled && inspection && (
        <Alert className="mb-6">
          <Calendar className="size-4" />
          <AlertDescription>
            <div>
              {t('inspection:edit.completingFrom', {
                date: format(parseISO(inspection.date as string), 'EEEE, MMMM d, yyyy'),
              })}
            </div>
            <div className="mt-1 flex items-center gap-2 text-green-600">
              <CheckCircle className="size-4" />
              {t('inspection:edit.markedCompleted')}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <InspectionForm
        inspectionId={id}
        aiDraft={state.aiDraft}
        aiSuggestedFields={state.aiSuggestedFields ?? []}
      />
    </div>
  );
};