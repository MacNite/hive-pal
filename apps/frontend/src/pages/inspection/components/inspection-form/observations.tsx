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

type ObservationItemProps<T> = {
  name: T;
  label: string;
};

const ObservationItem = <TName extends FieldPath<InspectionFormData>>({
  name,
  label,
}: ObservationItemProps<TName>) => {
  const { t } = useTranslation('inspection');
  const { control } = useFormContext<InspectionFormData>();
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

  return (
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
                  <label className="text-sm font-medium">{label}</label>
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
  );
};

type ObservationsSectionProps = {
  isAiSuggested?: (field: keyof InspectionFormData) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: keyof InspectionFormData) => void;
  onDismissSuggestion?: (field: keyof InspectionFormData) => void;
};

export const ObservationsSection: React.FC<ObservationsSectionProps> = ({
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('inspection');
  const { control } = useFormContext<InspectionFormData>();
  const queenCells = useWatch({ name: 'observations.queenCells', control });

  const observationSuggestion = aiMergeState?.suggestions.observations;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('observations.title')}
          {isAiSuggested?.('observations') && <AiBadge />}
        </h3>
      </div>

      <AiFieldControls
        isVisible={Boolean(observationSuggestion)}
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
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>{t('observations.queenSeen')}</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-3 mt-5 flex flex-col space-y-2">
          <ObservationItem
            name="observations.strength"
            label={t('observations.strength')}
          />
          <ObservationItem
            name="observations.cappedBrood"
            label={t('observations.cappedBrood')}
          />
          <ObservationItem
            name="observations.uncappedBrood"
            label={t('observations.uncappedBrood')}
          />

          <div className="mt-4">
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

                return (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      {t('observations.broodPattern')}
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {broodPatternOptions.map(option => (
                        <div
                          key={option}
                          className={`cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${
                            currentValue === option
                              ? 'border-green-300 bg-green-100 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => selectPattern(option)}
                        >
                          {t(`observations.broodPatternOptions.${option}`)}
                        </div>
                      ))}
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
          />
          <ObservationItem
            name="observations.pollenStores"
            label={t('observations.pollenStores')}
          />
          <ObservationItem
            name="observations.queenCells"
            label={t('observations.queenCells')}
          />

          {(queenCells ?? 0) > 0 && (
            <div className="grid grid-cols-2 space-x-2">
              <FormField
                control={control}
                name="observations.swarmCells"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>{t('observations.swarmCells')}</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="observations.supersedureCells"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow">
                    <FormControl>
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>{t('observations.supersedureCells')}</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="mt-6">
            <h4 className="mb-3 text-md font-medium">
              {t('observations.additionalObservations')}
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

                const toggleObservation = (value: string) => {
                  const updated = currentValues.includes(value)
                    ? currentValues.filter(v => v !== value)
                    : [...currentValues, value];
                  field.onChange(updated);
                };

                return (
                  <FormItem>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {availableOptions.map(option => (
                        <div
                          key={option}
                          className={`cursor-pointer rounded-md border p-2 text-center text-sm transition-colors ${
                            currentValues.includes(option)
                              ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => toggleObservation(option)}
                        >
                          {t(`observations.additional.${option}`)}
                        </div>
                      ))}
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