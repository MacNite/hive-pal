import type { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema';

export type AiFieldSuggestionStatus = 'pending' | 'accepted' | 'dismissed';

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenObject(
  value: Record<string, unknown>,
  prefix = '',
): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(nestedValue)) {
      result.push(...flattenObject(nestedValue, path));
      continue;
    }

    result.push([path, nestedValue]);
  }

  return result;
}

function getValueAtPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

export function buildAiMergeState(
  currentValues: Partial<InspectionFormData>,
  aiValues: Partial<InspectionFormData>,
): AiMergeState {
  const suggestions: Record<string, AiFieldSuggestion> = {};

  const flattened = flattenObject(aiValues as Record<string, unknown>);

  for (const [field, aiValue] of flattened) {
    if (aiValue === undefined) continue;

    const currentValue = getValueAtPath(currentValues, field);
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

export function shouldUseAiPrefill(
  currentValue: unknown,
  isDirty: boolean,
  suggestion?: { aiValue: unknown; status: 'pending' | 'accepted' | 'dismissed' } | null,
): boolean {
  if (!suggestion) return false;
  if (suggestion.status !== 'pending') return false;
  if (isDirty) return false;

  if (currentValue === undefined || currentValue === null) return true;
  if (typeof currentValue === 'string' && currentValue.trim() === '') return true;
  if (Array.isArray(currentValue) && currentValue.length === 0) return true;

  return false;
}