import { InspectionForm } from '@/pages/inspection/components/inspection-form';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useInspection } from '@/api/hooks/useInspections';
import { format, parseISO } from 'date-fns';

export const EditInspectionPage = () => {
  const { t } = useTranslation('inspection');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromScheduled = searchParams.get('from') === 'scheduled';
  const aiDraft = location.state?.aiDraft;
  const aiSuggestedFields = location.state?.aiSuggestedFields;

  const { data: inspection } = useInspection(id || '', {
    enabled: !!id && fromScheduled,
  });

  return (
    <>
      {fromScheduled && inspection && (
        <Alert className="mb-6">
          <Calendar className="size-4" />
          <AlertDescription>
            {t('inspection:edit.completingFrom', {
              date: format(parseISO(inspection.date as string), 'EEEE, MMMM d, yyyy'),
            })}
            <div className="mt-1 flex items-center gap-2 text-green-600">
              <CheckCircle className="size-4" />
              {t('inspection:edit.markedCompleted')}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <InspectionForm
        inspectionId={id}
        aiDraft={aiDraft}
        aiSuggestedFields={aiSuggestedFields}
      />
    </>
  );
};