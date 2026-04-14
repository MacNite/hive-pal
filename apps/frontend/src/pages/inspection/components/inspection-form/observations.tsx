import React from 'react';
import { FieldPath, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { X } from 'lucide-react';
import { InspectionFormData } from './schema';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { AiBadge } from './ai-badge';
import { AiFieldControls } from './ai-field-controls';
import type { AiMergeState } from '@/pages/inspection/lib/inspection-ai-merge';
import { cn } from '@/lib/utils';
import { shouldUseAiPrefill } from '@/pages/inspection/lib/inspection-ai-merge';

type ObservationItemProps<TName extends FieldPath<InspectionFormData>> = {
  name: TName;
  label: string;
  showAi?: boolean;
  aiValue?: number | null;
  useAiPrefill?: boolean;
  suggestionField?: string;
  suggestionStatus?: 'pending' | 'accepted' | 'dismissed';
  suggestionConflict?: boolean;
  onAcceptSuggestion?: (field: string) => void;
  onDismissSuggestion?: (field: string) => void;
};

const formatPreviewValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === '') return '—';
  return String(value);
};

const PreviewValuePill: React.FC<{
  label: string;
  value: unknown;
  variant?: 'current' | 'ai';
}> = ({ label, value, variant = 'current' }) => {
  return (
    <div
      className={cn(
        'rounded-md border px-2 py-1 text-xs',
        variant === 'ai'
          ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
      )}
    >
      <span className="mr-1 font-medium">{label}:</span>
      <span>{formatPreviewValue(value)}</span>
    </div>
  );
};

const AiValuePreview: React.FC<{
  isVisible: boolean;
  hasConflict?: boolean;
  currentValue: unknown;
  aiValue: unknown;
  className?: string;
}> = ({ isVisible, hasConflict, currentValue, aiValue, className }) => {
  if (!isVisible) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {hasConflict ? (
        <>
          <PreviewValuePill label="Current" value={currentValue} />
          <PreviewValuePill label="AI" value={aiValue} variant="ai" />
        </>
      ) : (
        <PreviewValuePill label="AI" value={aiValue} variant="ai" />
      )}
    </div>
  );
};

const ObservationItem = <TName extends FieldPath<InspectionFormData>>({
  name,
  label,
  showAi = false,
  aiValue,
  useAiPrefill = false,
  suggestionField,
  suggestionStatus,
  suggestionConflict,
  onAcceptSuggestion,
  onDismissSuggestion,
}: ObservationItemProps<TName>) => {
  const { t } = useTranslation('inspection');
  const { control } = useFormContext<InspectionFormData>();
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

  return (
    <div
      className={cn(
        'rounded-md p-2 transition-colors',
        showAi &&
          'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
      )}
    >
      <FormField
        control={control}
        name={name}
        render={({ field }) => {
          const currentValue = field.value as number | undefined | null;
          const displayValue =
            useAiPrefill && typeof aiValue === 'number' ? aiValue : currentValue;

          return (
            <FormItem>
              <FormControl>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                  <div className="min-w-32 w-32 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">{label}</label>
                      {showAi && <AiBadge />}
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          displayValue === 0
                            ? 'bg-gray-600 text-white dark:bg-gray-300 dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800',
                        )}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange(0);
                        }}
                        aria-label={t('observations.rateAs', { value: 0 })}
                      >
                        0
                      </button>

                      <div className="grid h-8 min-w-[220px] grow grid-cols-10 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fullValue => {
                          let color = 'bg-gray-200 dark:bg-gray-700';

                          if (hoveredValue != null && hoveredValue >= fullValue) {
                            color = 'bg-amber-200 dark:bg-amber-800';
                          } else if (
                            displayValue != null &&
                            displayValue >= fullValue
                          ) {
                            color = 'bg-amber-300 dark:bg-amber-700';
                          }

                          return (
                            <button
                              key={fullValue}
                              type="button"
                              className={cn(
                                'w-full rounded text-xs transition-colors duration-300',
                                color,
                                hoveredValue === fullValue
                                  ? 'text-gray-700 dark:text-gray-300'
                                  : 'text-transparent',
                              )}
                              onMouseEnter={() => setHoveredValue(fullValue)}
                              onMouseLeave={() => setHoveredValue(null)}
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                field.onChange(fullValue);
                                setHoveredValue(null);
                              }}
                              aria-label={t('observations.rateAs', {
                                value: fullValue,
                              })}
                            >
                              {hoveredValue === fullValue && hoveredValue}
                            </button>
                          );
                        })}
                      </div>

                      <div className="h-8 w-8 text-center">
                        <span className="block h-8 rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">
                          {displayValue ?? '-'}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        type="button"
                        disabled={displayValue == null}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange(undefined);
                        }}
                        aria-label={t('observations.clearRating')}
                      >
                        <X size={16} />
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <AiValuePreview
                        isVisible={Boolean(suggestionField)}
                        hasConflict={suggestionConflict}
                        currentValue={currentValue}
                        aiValue={aiValue}
                      />

                      <AiFieldControls
                        isVisible={Boolean(suggestionField)}
                        hasConflict={suggestionConflict}
                        status={suggestionStatus}
                        onAccept={() =>
                          suggestionField && onAcceptSuggestion?.(suggestionField)
                        }
                        onDismiss={() =>
                          suggestionField && onDismissSuggestion?.(suggestionField)
                        }
                      />
                    </div>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
};

type ObservationsSectionProps = {
  isAiSuggested?: (field: string) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: string) => void;
  onDismissSuggestion?: (field: string) => void;
};

export const ObservationsSection: React.FC<ObservationsSectionProps> = ({
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('inspection');
  const form = useFormContext<InspectionFormData>();
  const { control, formState } = form;

  const queenCells = useWatch({ name: 'observations.queenCells', control });
  const currentObservations = useWatch({ name: 'observations', control });

  const queenSeenSuggestion = aiMergeState?.suggestions['observations.queenSeen'];
  const broodPatternSuggestion =
    aiMergeState?.suggestions['observations.broodPattern'];
  const strengthSuggestion = aiMergeState?.suggestions['observations.strength'];
  const uncappedBroodSuggestion =
    aiMergeState?.suggestions['observations.uncappedBrood'];
  const cappedBroodSuggestion =
    aiMergeState?.suggestions['observations.cappedBrood'];
  const honeyStoresSuggestion =
    aiMergeState?.suggestions['observations.honeyStores'];
  const pollenStoresSuggestion =
    aiMergeState?.suggestions['observations.pollenStores'];
  const queenCellsSuggestion =
    aiMergeState?.suggestions['observations.queenCells'];
  const swarmCellsSuggestion =
    aiMergeState?.suggestions['observations.swarmCells'];
  const supersedureCellsSuggestion =
    aiMergeState?.suggestions['observations.supersedureCells'];
  const additionalSuggestion =
    aiMergeState?.suggestions['observations.additionalObservations'];
  const reminderSuggestion =
    aiMergeState?.suggestions['observations.reminderObservations'];

  const dirtyObservationFields = (formState.dirtyFields.observations ??
    {}) as Partial<
    Record<keyof NonNullable<InspectionFormData['observations']>, unknown>
  >;

  const getSuggestionAiValue = (field: string): unknown =>
    aiMergeState?.suggestions[field]?.aiValue;

  const hasAiField = (
    key: keyof NonNullable<InspectionFormData['observations']>,
  ) => getSuggestionAiValue(`observations.${key}`) !== undefined;

  const shouldPrefillField = (
    key: keyof NonNullable<InspectionFormData['observations']>,
    currentValue: unknown,
  ) =>
    hasAiField(key) &&
    shouldUseAiPrefill(
      currentValue,
      !!dirtyObservationFields[key],
      aiMergeState?.suggestions[`observations.${key}`],
    );

  const shouldPrefillNumericField = (
    key: keyof NonNullable<InspectionFormData['observations']>,
    currentValue: unknown,
  ) => {
    const suggestion = aiMergeState?.suggestions[`observations.${key}`];

    if (!hasAiField(key)) return false;
    if (suggestion?.status !== 'pending') return false;
    if (dirtyObservationFields[key]) return false;

    return currentValue === null || currentValue === undefined;
  };

  return (
    <div
      className={cn(
        'space-y-4 rounded-md p-3 transition-colors',
        Object.keys(aiMergeState?.suggestions ?? {}).some(key =>
          key.startsWith('observations.'),
        ) &&
          'border border-blue-200 bg-blue-50/20 dark:border-blue-900 dark:bg-blue-950/10',
      )}
      data-ai-field="observations"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          <span>{t('observations.title')}</span>
          {Object.keys(aiMergeState?.suggestions ?? {}).some(key =>
            key.startsWith('observations.'),
          ) && <AiBadge />}
        </h3>
      </div>

      <div className="grid grid-cols-2 space-2 md:grid-cols-3">
        <FormField
          control={control}
          name="observations.queenSeen"
          render={({ field }) => {
            const currentValue = Boolean(field.value ?? false);
            const aiValue = Boolean(queenSeenSuggestion?.aiValue);
            const displayChecked = shouldPrefillField('queenSeen', field.value)
              ? aiValue
              : currentValue;

            return (
              <FormItem
                className={cn(
                  'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow transition-colors',
                  hasAiField('queenSeen') &&
                    'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
                )}
              >
                <FormControl>
                  <Checkbox
                    checked={displayChecked}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <div className="min-w-0 flex-1 space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <span>{t('observations.queenSeen')}</span>
                    {isAiSuggested?.('observations.queenSeen') && <AiBadge />}
                  </FormLabel>

                  <AiValuePreview
                    isVisible={Boolean(queenSeenSuggestion)}
                    hasConflict={queenSeenSuggestion?.hasConflict}
                    currentValue={currentValue}
                    aiValue={aiValue}
                  />

                  <AiFieldControls
                    isVisible={Boolean(queenSeenSuggestion)}
                    hasConflict={queenSeenSuggestion?.hasConflict}
                    status={queenSeenSuggestion?.status}
                    onAccept={() =>
                      onAcceptSuggestion?.('observations.queenSeen')
                    }
                    onDismiss={() =>
                      onDismissSuggestion?.('observations.queenSeen')
                    }
                  />
                </div>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="col-span-3 mt-5 flex flex-col space-y-2">
          <ObservationItem
            name="observations.strength"
            label={t('observations.strength')}
            showAi={hasAiField('strength')}
            aiValue={
              typeof strengthSuggestion?.aiValue === 'number'
                ? strengthSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'strength',
              currentObservations?.strength,
            )}
            suggestionField="observations.strength"
            suggestionStatus={strengthSuggestion?.status}
            suggestionConflict={strengthSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          <ObservationItem
            name="observations.cappedBrood"
            label={t('observations.cappedBrood')}
            showAi={hasAiField('cappedBrood')}
            aiValue={
              typeof cappedBroodSuggestion?.aiValue === 'number'
                ? cappedBroodSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'cappedBrood',
              currentObservations?.cappedBrood,
            )}
            suggestionField="observations.cappedBrood"
            suggestionStatus={cappedBroodSuggestion?.status}
            suggestionConflict={cappedBroodSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          <ObservationItem
            name="observations.uncappedBrood"
            label={t('observations.uncappedBrood')}
            showAi={hasAiField('uncappedBrood')}
            aiValue={
              typeof uncappedBroodSuggestion?.aiValue === 'number'
                ? uncappedBroodSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'uncappedBrood',
              currentObservations?.uncappedBrood,
            )}
            suggestionField="observations.uncappedBrood"
            suggestionStatus={uncappedBroodSuggestion?.status}
            suggestionConflict={uncappedBroodSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          <div
            className={cn(
              'mt-4 rounded-md p-2 transition-colors',
              hasAiField('broodPattern') &&
                'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
            )}
          >
            <FormField
              control={control}
              name="observations.broodPattern"
              render={({ field }) => {
                const currentValue = field.value;
                const broodPatternOptions = [
                  'solid',
                  'spotty',
                  'scattered',
                  'patchy',
                  'excellent',
                  'poor',
                ];

                const aiBroodPattern =
                  typeof broodPatternSuggestion?.aiValue === 'string'
                    ? broodPatternSuggestion.aiValue
                    : undefined;

                const displayValue = shouldPrefillField(
                  'broodPattern',
                  currentValue,
                )
                  ? aiBroodPattern
                  : currentValue;

                const selectPattern = (value: string) => {
                  field.onChange(displayValue === value ? null : value);
                };

                return (
                  <FormItem>
                    <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <FormLabel className="flex items-center gap-2 text-sm font-medium">
                        <span>{t('observations.broodPattern')}</span>
                        {isAiSuggested?.('observations.broodPattern') && (
                          <AiBadge />
                        )}
                      </FormLabel>

                      <AiValuePreview
                        isVisible={Boolean(broodPatternSuggestion)}
                        hasConflict={broodPatternSuggestion?.hasConflict}
                        currentValue={currentValue}
                        aiValue={aiBroodPattern}
                      />

                      <AiFieldControls
                        isVisible={Boolean(broodPatternSuggestion)}
                        hasConflict={broodPatternSuggestion?.hasConflict}
                        status={broodPatternSuggestion?.status}
                        onAccept={() =>
                          onAcceptSuggestion?.('observations.broodPattern')
                        }
                        onDismiss={() =>
                          onDismissSuggestion?.('observations.broodPattern')
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {broodPatternOptions.map(option => {
                        const isAiRecommended = aiBroodPattern === option;

                        return (
                          <div
                            key={option}
                            className={cn(
                              'cursor-pointer rounded-md border p-2 text-center text-sm transition-colors',
                              displayValue === option
                                ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isAiRecommended &&
                                'ring-2 ring-blue-300 dark:ring-blue-700',
                            )}
                            onClick={() => selectPattern(option)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>
                                {t(
                                  `observations.broodPatternOptions.${option}`,
                                )}
                              </span>
                              {isAiRecommended && <AiBadge />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          <ObservationItem
            name="observations.honeyStores"
            label={t('observations.honeyStores')}
            showAi={hasAiField('honeyStores')}
            aiValue={
              typeof honeyStoresSuggestion?.aiValue === 'number'
                ? honeyStoresSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'honeyStores',
              currentObservations?.honeyStores,
            )}
            suggestionField="observations.honeyStores"
            suggestionStatus={honeyStoresSuggestion?.status}
            suggestionConflict={honeyStoresSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          <ObservationItem
            name="observations.pollenStores"
            label={t('observations.pollenStores')}
            showAi={hasAiField('pollenStores')}
            aiValue={
              typeof pollenStoresSuggestion?.aiValue === 'number'
                ? pollenStoresSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'pollenStores',
              currentObservations?.pollenStores,
            )}
            suggestionField="observations.pollenStores"
            suggestionStatus={pollenStoresSuggestion?.status}
            suggestionConflict={pollenStoresSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          <ObservationItem
            name="observations.queenCells"
            label={t('observations.queenCells')}
            showAi={hasAiField('queenCells')}
            aiValue={
              typeof queenCellsSuggestion?.aiValue === 'number'
                ? queenCellsSuggestion.aiValue
                : undefined
            }
            useAiPrefill={shouldPrefillNumericField(
              'queenCells',
              currentObservations?.queenCells,
            )}
            suggestionField="observations.queenCells"
            suggestionStatus={queenCellsSuggestion?.status}
            suggestionConflict={queenCellsSuggestion?.hasConflict}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
          />

          {(queenCells ?? 0) > 0 && (
            <div className="grid grid-cols-2 space-x-2">
              <FormField
                control={control}
                name="observations.swarmCells"
                render={({ field }) => {
                  const currentValue = Boolean(field.value ?? false);
                  const aiValue = Boolean(swarmCellsSuggestion?.aiValue);
                  const displayChecked = shouldPrefillField(
                    'swarmCells',
                    field.value,
                  )
                    ? aiValue
                    : currentValue;

                  return (
                    <FormItem
                      className={cn(
                        'flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow transition-colors',
                        hasAiField('swarmCells') &&
                          'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
                      )}
                    >
                      <FormControl>
                        <Checkbox
                          checked={displayChecked}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>

                      <div className="min-w-0 flex-1 space-y-2">
                        <FormLabel className="flex items-center gap-2">
                          <span>{t('observations.swarmCells')}</span>
                          {isAiSuggested?.('observations.swarmCells') && (
                            <AiBadge />
                          )}
                        </FormLabel>

                        <AiValuePreview
                          isVisible={Boolean(swarmCellsSuggestion)}
                          hasConflict={swarmCellsSuggestion?.hasConflict}
                          currentValue={currentValue}
                          aiValue={aiValue}
                        />

                        <AiFieldControls
                          isVisible={Boolean(swarmCellsSuggestion)}
                          hasConflict={swarmCellsSuggestion?.hasConflict}
                          status={swarmCellsSuggestion?.status}
                          onAccept={() =>
                            onAcceptSuggestion?.('observations.swarmCells')
                          }
                          onDismiss={() =>
                            onDismissSuggestion?.('observations.swarmCells')
                          }
                        />
                      </div>

                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={control}
                name="observations.supersedureCells"
                render={({ field }) => {
                  const currentValue = Boolean(field.value ?? false);
                  const aiValue = Boolean(supersedureCellsSuggestion?.aiValue);
                  const displayChecked = shouldPrefillField(
                    'supersedureCells',
                    field.value,
                  )
                    ? aiValue
                    : currentValue;

                  return (
                    <FormItem
                      className={cn(
                        'flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow transition-colors',
                        hasAiField('supersedureCells') &&
                          'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
                      )}
                    >
                      <FormControl>
                        <Checkbox
                          checked={displayChecked}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>

                      <div className="min-w-0 flex-1 space-y-2">
                        <FormLabel className="flex items-center gap-2">
                          <span>{t('observations.supersedureCells')}</span>
                          {isAiSuggested?.(
                            'observations.supersedureCells',
                          ) && <AiBadge />}
                        </FormLabel>

                        <AiValuePreview
                          isVisible={Boolean(supersedureCellsSuggestion)}
                          hasConflict={supersedureCellsSuggestion?.hasConflict}
                          currentValue={currentValue}
                          aiValue={aiValue}
                        />

                        <AiFieldControls
                          isVisible={Boolean(supersedureCellsSuggestion)}
                          hasConflict={supersedureCellsSuggestion?.hasConflict}
                          status={supersedureCellsSuggestion?.status}
                          onAccept={() =>
                            onAcceptSuggestion?.(
                              'observations.supersedureCells',
                            )
                          }
                          onDismiss={() =>
                            onDismissSuggestion?.(
                              'observations.supersedureCells',
                            )
                          }
                        />
                      </div>

                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          )}

          <div
            className={cn(
              'mt-6 rounded-md p-2 transition-colors',
              hasAiField('additionalObservations') &&
                'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
            )}
          >
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h4 className="flex items-center gap-2 text-md font-medium">
                <span>{t('observations.additionalObservations')}</span>
                {isAiSuggested?.('observations.additionalObservations') && (
                  <AiBadge />
                )}
              </h4>

              <AiValuePreview
                isVisible={Boolean(additionalSuggestion)}
                hasConflict={additionalSuggestion?.hasConflict}
                currentValue={
                  Array.isArray(currentObservations?.additionalObservations)
                    ? currentObservations.additionalObservations
                    : []
                }
                aiValue={
                  Array.isArray(additionalSuggestion?.aiValue)
                    ? additionalSuggestion.aiValue
                    : []
                }
              />

              <AiFieldControls
                isVisible={Boolean(additionalSuggestion)}
                hasConflict={additionalSuggestion?.hasConflict}
                status={additionalSuggestion?.status}
                onAccept={() =>
                  onAcceptSuggestion?.('observations.additionalObservations')
                }
                onDismiss={() =>
                  onDismissSuggestion?.('observations.additionalObservations')
                }
              />
            </div>

            <FormField
              control={control}
              name="observations.additionalObservations"
              render={({ field }) => {
                const currentValues: string[] = field.value || [];
                const availableOptions = [
                  'calm',
                  'defensive',
                  'aggressive',
                  'nervous',
                  'varroa_present',
                  'small_hive_beetle',
                  'wax_moths',
                  'ants_present',
                  'healthy',
                  'active',
                  'sluggish',
                  'thriving',
                ];
                const aiValues = Array.isArray(additionalSuggestion?.aiValue)
                  ? (additionalSuggestion.aiValue as string[])
                  : [];

                const displayValues = shouldPrefillField(
                  'additionalObservations',
                  currentValues,
                )
                  ? aiValues
                  : currentValues;

                const toggleObservation = (value: string) => {
                  const updated = displayValues.includes(value)
                    ? displayValues.filter(v => v !== value)
                    : [...displayValues, value];
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {availableOptions.map(option => {
                        const isAiRecommended = aiValues.includes(option);

                        return (
                          <div
                            key={option}
                            className={cn(
                              'cursor-pointer rounded-md border p-2 text-center text-sm transition-colors',
                              displayValues.includes(option)
                                ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isAiRecommended &&
                                'ring-2 ring-blue-300 dark:ring-blue-700',
                            )}
                            onClick={() => toggleObservation(option)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>
                                {t(`observations.additional.${option}`)}
                              </span>
                              {isAiRecommended && <AiBadge />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          <div
            className={cn(
              'mt-6 rounded-md p-2 transition-colors',
              hasAiField('reminderObservations') &&
                'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
            )}
          >
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h4 className="flex items-center gap-2 text-md font-medium">
                <span>{t('observations.reminderObservations')}</span>
                {isAiSuggested?.('observations.reminderObservations') && (
                  <AiBadge />
                )}
              </h4>

              <AiValuePreview
                isVisible={Boolean(reminderSuggestion)}
                hasConflict={reminderSuggestion?.hasConflict}
                currentValue={
                  Array.isArray(currentObservations?.reminderObservations)
                    ? currentObservations.reminderObservations
                    : []
                }
                aiValue={
                  Array.isArray(reminderSuggestion?.aiValue)
                    ? reminderSuggestion.aiValue
                    : []
                }
              />

              <AiFieldControls
                isVisible={Boolean(reminderSuggestion)}
                hasConflict={reminderSuggestion?.hasConflict}
                status={reminderSuggestion?.status}
                onAccept={() =>
                  onAcceptSuggestion?.('observations.reminderObservations')
                }
                onDismiss={() =>
                  onDismissSuggestion?.('observations.reminderObservations')
                }
              />
            </div>

            <FormField
              control={control}
              name="observations.reminderObservations"
              render={({ field }) => {
                const currentValues = field.value || [];
                const availableOptions = [
                  'honey_bound',
                  'overcrowded',
                  'needs_super',
                  'queen_issues',
                  'requires_treatment',
                  'low_stores',
                  'prepare_for_winter',
                ];
                const aiValues = Array.isArray(reminderSuggestion?.aiValue)
                  ? (reminderSuggestion.aiValue as string[])
                  : [];

                const displayValues = shouldPrefillField(
                  'reminderObservations',
                  currentValues,
                )
                  ? aiValues
                  : currentValues;

                const toggleObservation = (value: string) => {
                  const updated = displayValues.includes(value)
                    ? displayValues.filter(v => v !== value)
                    : [...displayValues, value];
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {availableOptions.map(option => {
                        const isAiRecommended = aiValues.includes(option);

                        return (
                          <div
                            key={option}
                            className={cn(
                              'cursor-pointer rounded-md border p-2 text-center text-sm transition-colors',
                              displayValues.includes(option)
                                ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isAiRecommended &&
                                'ring-2 ring-blue-300 dark:ring-blue-700',
                            )}
                            onClick={() => toggleObservation(option)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{t(`observations.reminder.${option}`)}</span>
                              {isAiRecommended && <AiBadge />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};