import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { InspectionFormData } from './schema';
import {
  buildAiMergeState,
  type AiMergeState,
} from '@/pages/inspection/lib/inspection-ai-merge';

type UseInspectionAiMergeParams = {
  form: UseFormReturn<InspectionFormData>;
  aiDraft?: Partial<InspectionFormData>;
  aiSuggestedFields?: string[];
};

export const useInspectionAiMerge = ({
  form,
  aiDraft,
  aiSuggestedFields = [],
}: UseInspectionAiMergeParams) => {
  const [aiMergeState, setAiMergeState] = useState<AiMergeState | null>(null);

  const aiSuggestedFieldSet = useMemo(
    () => new Set(aiSuggestedFields),
    [aiSuggestedFields],
  );

  const isAiSuggested = useCallback(
    (field: string) => aiSuggestedFieldSet.has(field),
    [aiSuggestedFieldSet],
  );

  useEffect(() => {
    if (!aiDraft || aiSuggestedFields.length === 0) {
      setAiMergeState(null);
      return;
    }

    const currentValues = form.getValues();
    const mergeState = buildAiMergeState(currentValues, aiDraft);

    const filteredSuggestions = Object.fromEntries(
      Object.entries(mergeState.suggestions).filter(([field]) =>
        aiSuggestedFieldSet.has(field),
      ),
    );

    if (Object.keys(filteredSuggestions).length === 0) {
      setAiMergeState(null);
      return;
    }

    setAiMergeState({
      suggestions: filteredSuggestions,
    });
  }, [aiDraft, aiSuggestedFields, aiSuggestedFieldSet, form]);

  const acceptAiSuggestion = useCallback(
    (field: string) => {
      const suggestion = aiMergeState?.suggestions[field];
      if (!suggestion) return;

      form.setValue(field as never, suggestion.aiValue as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      setAiMergeState(prev => {
        if (!prev) return prev;

        return {
          suggestions: {
            ...prev.suggestions,
            [field]: {
              ...prev.suggestions[field],
              status: 'accepted',
            },
          },
        };
      });
    },
    [aiMergeState, form],
  );

  const dismissAiSuggestion = useCallback((field: string) => {
    setAiMergeState(prev => {
      if (!prev) return prev;

      return {
        suggestions: {
          ...prev.suggestions,
          [field]: {
            ...prev.suggestions[field],
            status: 'dismissed',
          },
        },
      };
    });
  }, []);

  const acceptAllSafeAiSuggestions = useCallback(() => {
    if (!aiMergeState) return;

    Object.values(aiMergeState.suggestions).forEach(suggestion => {
      if (suggestion.status !== 'pending') return;
      if (suggestion.hasConflict) return;

      form.setValue(suggestion.field as never, suggestion.aiValue as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    });

    setAiMergeState(prev => {
      if (!prev) return prev;

      return {
        suggestions: Object.fromEntries(
          Object.entries(prev.suggestions).map(([field, suggestion]) => {
            if (suggestion.status !== 'pending' || suggestion.hasConflict) {
              return [field, suggestion];
            }

            return [field, { ...suggestion, status: 'accepted' }];
          }),
        ),
      };
    });
  }, [aiMergeState, form]);

  const reviewConflicts = useCallback(() => {
    const firstConflict = aiMergeState
      ? Object.values(aiMergeState.suggestions).find(
          suggestion =>
            suggestion.status === 'pending' && suggestion.hasConflict,
        )
      : null;

    if (!firstConflict) return;

    const element = document.querySelector(
      `[data-ai-field="${firstConflict.field}"]`,
    );

    if (element instanceof HTMLElement) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [aiMergeState]);

  const dismissAllAiSuggestions = useCallback(() => {
    if (!aiMergeState) return;

    setAiMergeState({
      suggestions: Object.fromEntries(
        Object.entries(aiMergeState.suggestions).map(([field, suggestion]) => [
          field,
          { ...suggestion, status: 'dismissed' },
        ]),
      ),
    });
  }, [aiMergeState]);

  const pendingSuggestionCount = aiMergeState
    ? Object.values(aiMergeState.suggestions).filter(
        suggestion => suggestion.status === 'pending',
      ).length
    : 0;

  const conflictSuggestionCount = aiMergeState
    ? Object.values(aiMergeState.suggestions).filter(
        suggestion => suggestion.status === 'pending' && suggestion.hasConflict,
      ).length
    : 0;

  return {
    aiMergeState,
    isAiSuggested,
    acceptAiSuggestion,
    dismissAiSuggestion,
    acceptAllSafeAiSuggestions,
    reviewConflicts,
    dismissAllAiSuggestions,
    pendingSuggestionCount,
    conflictSuggestionCount,
  };
};