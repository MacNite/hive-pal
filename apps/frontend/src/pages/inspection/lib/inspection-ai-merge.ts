import type { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema';

export type AiFieldSuggestionStatus =
  | 'pending'
  | 'accepted'
  | 'dismissed';

export type AiFieldSuggestion<T = unknown> = {
  field: string;
  aiValue: T;
  currentValue: T | undefined;
  hasConflict: boolean;
  status: AiFieldSuggestionStatus;
};

export type AiMergeState = {
  suggestions: Record<string, AiFieldSuggestion>;
};

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function buildAiMergeState(
  currentValues: Partial<InspectionFormData>,
  aiValues: Partial<InspectionFormData>,
): AiMergeState {
  const suggestions: Record<string, AiFieldSuggestion> = {};

  for (const [field, aiValue] of Object.entries(aiValues)) {
    if (aiValue === undefined) continue;

    const currentValue = currentValues[field as keyof InspectionFormData];
    const hasConflict = !isEmptyValue(currentValue);

    suggestions[field] = {
      field,
      aiValue,
      currentValue,
      hasConflict,
      status: 'pending',
    };
  }

  return { suggestions };
}