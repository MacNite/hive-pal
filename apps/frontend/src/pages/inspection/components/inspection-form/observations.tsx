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
import { AiSectionPreview } from './ai-section-preview';
import type { AiMergeState } from '@/pages/inspection/lib/inspection-ai-merge';
import { cn } from '@/lib/utils';

type ObservationItemProps<T> = {
  name: T;
  label: string;
  showAi?: boolean;
};

const ObservationItem = <TName extends FieldPath<InspectionFormData>>({
  name,
  label,
  showAi = false,
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
          const currentValue = field.value as number | undefined;

          return (
            <FormItem>
              <FormControl>
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
                  <div className="mr-4 min-w-32 w-32">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">{label}</label>
                      {showAi && <AiBadge />}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="mb-2 flex items-center">
                      <button
                        type="button"
                        className={`mr-2 flex h-8 w-8 items-center justify-center rounded-lg ${
                          currentValue === 0
                            ? 'bg-gray-600 text-white dark:bg-gray-300 dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          field.onChange(0);
                        }}
                        aria-label={t('observations.rateAs', { value: 0 })}
                      >
                        0
                      </button>

                      <div className="grid h-8 grow grid-cols-10 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fullValue => {
                          let color = 'bg-gray-200 dark:bg-gray-700';

                          if (hoveredValue != null && hoveredValue >= fullValue) {
                            color = 'bg-amber-200 dark:bg-amber-800';
                          } else if (
                            currentValue != null &&
                            currentValue >= fullValue
                          ) {
                            color = 'bg-amber-300 dark:bg-amber-700';
                          }

                          return (
                            <button
                              key={fullValue}
                              type="button"
                              className={`w-full rounded text-xs transition-colors duration-300 ${color} ${
                                hoveredValue === fullValue
                                  ? 'text-gray-700 dark:text-gray-300'
                                  : 'text-transparent'
                              }`}
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

                      <div className="ml-4 h-8 w-8 text-center">
                        <span className="block h-8 rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">
                          {currentValue ?? '-'}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        type="button"
                        disabled={currentValue == null}
                        className="ml-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
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
  isAiSuggested?: (field: keyof InspectionFormData) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: keyof InspectionFormData) => void;
  onDismissSuggestion?: (field: keyof InspectionFormData) => void;
};

function formatObservationPreview(value: unknown, t: (key: string) => string) {
  if (!value || typeof value !== 'object') {
    return <span className="italic text-muted-foreground">{t('common.empty')}</span>;
  }

  try {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  } catch {
    return (
      <span className="italic text-muted-foreground">
        Unable to preview observation data
      </span>
    );
  }
}

export const ObservationsSection: React.FC<ObservationsSectionProps> = ({
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('inspection');
  const { control } = useFormContext<InspectionFormData>();

  const queenCells = useWatch({ name: 'observations.queenCells', control });
  const currentObservations = useWatch({ name: 'observations', control });

  const observationSuggestion = aiMergeState?.suggestions.observations;
  const aiObservationValue =
    observationSuggestion?.aiValue &&
    typeof observationSuggestion.aiValue === 'object'
      ? (observationSuggestion.aiValue as Partial<InspectionFormData['observations']>)
      : undefined;
  const isPending = observationSuggestion?.status === 'pending';

  const hasAiField = (
    key: keyof NonNullable<InspectionFormData['observations']>,
  ) => aiObservationValue?.[key] !== undefined;

  return (
    <div
      className={cn(
        'space-y-4 rounded-md p-3 transition-colors',
        isPending &&
          'border border-blue-200 bg-blue-50/20 dark:border-blue-900 dark:bg-blue-950/10',
      )}
      data-ai-field="observations"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-medium">
          <span>{t('observations.title')}</span>
          {isAiSuggested?.('observations') && <AiBadge />}
        </h3>
      </div>

      <AiSectionPreview
        title={t('observations.title')}
        summary="Review AI-suggested observation fields before applying them."
        currentValue={formatObservationPreview(currentObservations, t)}
        suggestedValue={formatObservationPreview(
          observationSuggestion?.aiValue,
          t,
        )}
        hasConflict={observationSuggestion?.hasConflict}
        status={observationSuggestion?.status}
        onAccept={() => onAcceptSuggestion?.('observations')}
        onDismiss={() => onDismissSuggestion?.('observations')}
      />

      <div className="grid grid-cols-2 space-2 md:grid-cols-3">
        <FormField
          control={control}
          name="observations.queenSeen"
          render={({ field }) => (
            <FormItem
              className={cn(
                'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow transition-colors',
                hasAiField('queenSeen') &&
                  'border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
              )}
            >
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1">
                <FormLabel className="flex items-center gap-2">
                  <span>{t('observations.queenSeen')}</span>
                  {hasAiField('queenSeen') && <AiBadge />}
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-3 mt-5 flex flex-col space-y-2">
          <ObservationItem
            name="observations.strength"
            label={t('observations.strength')}
            showAi={hasAiField('strength')}
          />
          <ObservationItem
            name="observations.cappedBrood"
            label={t('observations.cappedBrood')}
            showAi={hasAiField('cappedBrood')}
          />
          <ObservationItem
            name="observations.uncappedBrood"
            label={t('observations.uncappedBrood')}
            showAi={hasAiField('uncappedBrood')}
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

                const selectPattern = (value: string) => {
                  field.onChange(currentValue === value ? null : value);
                };

                const aiBroodPattern = aiObservationValue?.broodPattern;

                return (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                      <span>{t('observations.broodPattern')}</span>
                      {hasAiField('broodPattern') && <AiBadge />}
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {broodPatternOptions.map(option => {
                        const isAiRecommended = aiBroodPattern === option;

                        return (
                          <div
                            key={option}
                            className={cn(
                              'cursor-pointer rounded-md border p-2 text-center text-sm transition-colors',
                              currentValue === option
                                ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isAiRecommended &&
                                'ring-2 ring-blue-300 dark:ring-blue-700',
                            )}
                            onClick={() => selectPattern(option)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>
                                {t(`observations.broodPatternOptions.${option}`)}
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
          />
          <ObservationItem
            name="observations.pollenStores"
            label={t('observations.pollenStores')}
            showAi={hasAiField('pollenStores')}
          />
          <ObservationItem
            name="observations.queenCells"
            label={t('observations.queenCells')}
            showAi={hasAiField('queenCells')}
          />

          {(queenCells ?? 0) > 0 && (
            <div className="grid grid-cols-2 space-x-2">
              <FormField
                control={control}
                name="observations.swarmCells"
                render={({ field }) => (
                  <FormItem
                    className={cn(
                      'flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow transition-colors',
                      hasAiField('swarmCells') &&
                        'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
                    )}
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="flex items-center gap-2">
                      <span>{t('observations.swarmCells')}</span>
                      {hasAiField('swarmCells') && <AiBadge />}
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="observations.supersedureCells"
                render={({ field }) => (
                  <FormItem
                    className={cn(
                      'flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow transition-colors',
                      hasAiField('supersedureCells') &&
                        'border border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20',
                    )}
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="flex items-center gap-2">
                      <span>{t('observations.supersedureCells')}</span>
                      {hasAiField('supersedureCells') && <AiBadge />}
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
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
            <h4 className="mb-3 flex items-center gap-2 text-md font-medium">
              <span>{t('observations.additionalObservations')}</span>
              {hasAiField('additionalObservations') && <AiBadge />}
            </h4>
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
                const aiValues = Array.isArray(
                  aiObservationValue?.additionalObservations,
                )
                  ? aiObservationValue?.additionalObservations
                  : [];

                const toggleObservation = (value: string) => {
                  const updated = currentValues.includes(value)
                    ? currentValues.filter(v => v !== value)
                    : [...currentValues, value];
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {availableOptions.map(option => {
                        const isAiRecommended = aiValues?.includes(option);

                        return (
                          <div
                            key={option}
                            className={cn(
                              'cursor-pointer rounded-md border p-2 text-center text-sm transition-colors',
                              currentValues.includes(option)
                                ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700',
                              isAiRecommended &&
                                'ring-2 ring-blue-300 dark:ring-blue-700',
                            )}
                            onClick={() => toggleObservation(option)}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span>{t(`observations.additional.${option}`)}</span>
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

          <div className="mt-6">
            <h4 className="mb-3 text-md font-medium">
              {t('observations.reminderObservations')}
            </h4>
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

                const toggleObservation = (value: string) => {
                  const updated = currentValues.includes(value)
                    ? currentValues.filter(v => v !== value)
                    : [...currentValues, value];
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {availableOptions.map(option => (
                        <div
                          key={option}
                          className={`cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${
                            currentValues.includes(option)
                              ? 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => toggleObservation(option)}
                        >
                          {t(`observations.reminder.${option}`)}
                        </div>
                      ))}
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