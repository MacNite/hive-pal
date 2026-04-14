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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;

  // Important:
  // false and 0 are valid AI suggestions, so they must count as meaningful.
  return true;
}

function flattenSuggestedFields(
  value: Record<string, unknown>,
  prefix = '',
): string[] {
  const result: string[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(nestedValue)) {
      result.push(...flattenSuggestedFields(nestedValue, path));
      continue;
    }

    if (isMeaningfulValue(nestedValue)) {
      result.push(path);
    }
  }

  return result;
}

function getSuggestedFields(
  aiDraft?: Partial<InspectionFormData>,
  aiSuggestedFields?: string[],
): string[] {
  if (Array.isArray(aiSuggestedFields) && aiSuggestedFields.length > 0) {
    return aiSuggestedFields;
  }

  if (!aiDraft || !isPlainObject(aiDraft)) {
    return [];
  }

  return flattenSuggestedFields(aiDraft as Record<string, unknown>);
}

export const EditInspectionPage = () => {
  const { t } = useTranslation('inspection');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromScheduled = searchParams.get('from') === 'scheduled';
  const fromAi = searchParams.get('from') === 'ai';

  const state = (location.state ?? {}) as EditInspectionLocationState;

  const { data: inspection } = useInspection(id || '', {
    enabled: !!id && fromScheduled,
  });

  const resolvedAiSuggestedFields = fromAi
    ? getSuggestedFields(state.aiDraft, state.aiSuggestedFields)
    : [];

  const aiDraft = fromAi ? state.aiDraft : undefined;

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
        aiDraft={aiDraft}
        aiSuggestedFields={resolvedAiSuggestedFields}
      />
    </div>
  );
};