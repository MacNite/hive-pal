import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils.ts';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { InspectionFormData, inspectionSchema } from './schema';
import { WeatherSection } from '@/pages/inspection/components/inspection-form/weather.tsx';
import { ObservationsSection } from '@/pages/inspection/components/inspection-form/observations.tsx';
import { NotesSection } from '@/pages/inspection/components/inspection-form/notes.tsx';
import { Separator } from '@/components/ui/separator';
import { ActionsSection } from '@/pages/inspection/components/inspection-form/actions.tsx';
import {
  useHiveOptions,
  useInspection,
  useHive,
  useWeatherForDate,
  useUpsertInspection,
} from '@/api/hooks';
import { ActionType, InspectionStatus } from 'shared-schemas';
import { mapWeatherConditionToForm } from '@/utils/weather-mapping';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AudioSection } from './audio-section';
import { PhotosSection, PendingPhoto } from './photos-section';
import { ScorePreviewSection } from './score-preview';
import {
  buildAiMergeState,
  type AiMergeState,
} from '@/pages/inspection/lib/inspection-ai-merge';
import { AiMergeBanner } from '@/pages/inspection/components/inspection-form/ai-merge-banner';
import { InspectionDateTimePicker } from '@/components/inspection-date-time-picker';

interface PendingRecording {
  id: string;
  blob: Blob;
  duration: number;
  fileName: string;
}

type InspectionFormProps = {
  hiveId?: string;
  inspectionId?: string;
  mode?: 'standalone' | 'batch';
  onSubmitSuccess?: (data: InspectionFormData) => void;
  onCancel?: () => void;
  submitButtonText?: React.ReactNode;
  showCancelButton?: boolean;
  aiDraft?: Partial<InspectionFormData>;
  aiSuggestedFields?: string[];
};

export const InspectionForm: React.FC<InspectionFormProps> = ({
  hiveId,
  inspectionId,
  mode = 'standalone',
  onSubmitSuccess,
  onCancel,
  submitButtonText,
  showCancelButton = false,
  aiDraft,
  aiSuggestedFields = [],
}) => {
  const { t } = useTranslation('inspection');
  const [searchParams] = useSearchParams();
  const fromScheduled = searchParams.get('from') === 'scheduled';
  const { data: hives } = useHiveOptions();
  const [pendingRecordings, setPendingRecordings] = useState<
    PendingRecording[]
  >([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);

  const { data: inspection } = useInspection(inspectionId as string, {
    enabled: !!inspectionId,
  });

  const form = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      hiveId,
      ...inspection,
      date: inspection?.date ? new Date(inspection.date) : new Date(),
      isAllDay: inspection?.isAllDay ?? true,
      actions:
        inspection?.actions?.map(action => {
          if (action.details.type === ActionType.FEEDING) {
            const details = action.details;
            return {
              type: ActionType.FEEDING,
              notes: action.notes ?? '',
              feedType: details.feedType,
              quantity: details.amount,
              unit: details.unit,
              concentration: details.concentration ?? '',
            };
          }

          if (action.details.type === ActionType.TREATMENT) {
            const details = action.details;
            return {
              type: ActionType.TREATMENT,
              notes: action.notes ?? '',
              amount: details.quantity,
              treatmentType: details.product,
              unit: details.unit,
            };
          }

          if (action.details.type === ActionType.FRAME) {
            const details = action.details;
            return {
              type: ActionType.FRAME,
              notes: action.notes ?? '',
              frames: details.quantity,
            };
          }

          if (action.details.type === ActionType.MAINTENANCE) {
            const details = action.details;
            return {
              type: ActionType.MAINTENANCE,
              notes: action.notes ?? '',
              component: details.component,
              status: details.status,
            };
          }

          if (action.details.type === ActionType.NOTE) {
            const details = action.details;
            return {
              type: ActionType.NOTE,
              notes: details.content || action.notes || '',
            };
          }

          return {
            type: ActionType.OTHER,
            notes: action.notes || '',
          };
        }) || [],
    },
  });

  const selectedHiveId = form.watch('hiveId');
  const selectedDate = form.watch('date');

  const { data: selectedHive } = useHive(selectedHiveId || '', {
    enabled: !!selectedHiveId,
  });

  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const isDateInFuture = selectedDate && selectedDate > new Date();

  const { data: weatherData } = useWeatherForDate(
    selectedHive?.apiaryId || '',
    dateString,
    {
      enabled: !!selectedHive?.apiaryId && !!dateString && !isDateInFuture,
    },
  );

  const aiSuggestedFieldSet = useMemo(
    () => new Set(aiSuggestedFields),
    [aiSuggestedFields],
  );

  const isAiSuggested = (field: string) => aiSuggestedFieldSet.has(field);

  useEffect(() => {
    if (weatherData && !isDateInFuture && selectedHive?.apiaryId) {
      form.setValue('temperature', Math.round(weatherData.temperature));

      const mappedCondition = mapWeatherConditionToForm(weatherData.condition);
      form.setValue('weatherConditions', mappedCondition);
    }
  }, [weatherData, form, isDateInFuture, selectedHive?.apiaryId]);

  const [aiMergeState, setAiMergeState] = useState<AiMergeState | null>(null);

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

  const acceptAiSuggestion = (field: string) => {
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
  };

  const dismissAiSuggestion = (field: string) => {
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
  };

  const acceptAllSafeAiSuggestions = () => {
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
  };

  const reviewConflicts = () => {
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
  };

  const dismissAllAiSuggestions = () => {
    if (!aiMergeState) return;

    setAiMergeState({
      suggestions: Object.fromEntries(
        Object.entries(aiMergeState.suggestions).map(([field, suggestion]) => [
          field,
          { ...suggestion, status: 'dismissed' },
        ]),
      ),
    });
  };

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

  const onSubmit = useUpsertInspection(inspectionId);

  const handleSave = form.handleSubmit(data => {
    if (mode === 'batch' && onSubmitSuccess) {
      onSubmitSuccess(data);
    } else {
      const status = fromScheduled ? InspectionStatus.COMPLETED : undefined;
      onSubmit(data, status);
    }
  });

  const handleSaveAndComplete = form.handleSubmit(data => {
    if (mode === 'batch' && onSubmitSuccess) {
      onSubmitSuccess(data);
    } else {
      onSubmit(data, InspectionStatus.COMPLETED);
    }
  });

  const date = form.watch('date');
  const isAllDay = form.watch('isAllDay') ?? true;
  const isInFuture = date && date > new Date();
  const isEdit = Boolean(inspectionId);
  const isCompleted = inspection?.status === InspectionStatus.COMPLETED;
  const { isSubmitting } = form.formState;

  return (
    <div className="ml-4 max-w-4xl">
      <h1 className="text-lg font-bold">
        {isEdit
          ? t('inspection:form.editInspection')
          : t('inspection:form.newInspection')}
      </h1>

      <Separator className="my-2" />

      {aiMergeState && pendingSuggestionCount > 0 && (
        <AiMergeBanner
          pendingCount={pendingSuggestionCount}
          conflictCount={conflictSuggestionCount}
          onAcceptAllSafe={acceptAllSafeAiSuggestions}
          onReviewConflicts={reviewConflicts}
          onDismissAll={dismissAllAiSuggestions}
        />
      )}

      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-6">
          <FormField
            control={form.control}
            name="hiveId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('inspection:form.hive')}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? hiveId}
                    disabled={mode === 'batch'}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t('inspection:form.selectHive')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {hives?.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode !== 'batch' && (
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('inspection:form.inspectionDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          {field.value ? (
                            isAllDay
                              ? format(field.value, 'PPP')
                              : format(field.value, 'PPP HH:mm')
                          ) : (
                            <span>{t('inspection:form.pickDate')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={selected => {
                          if (!selected) return;
                          if (!isAllDay && field.value) {
                            selected.setHours(
                              field.value.getHours(),
                              field.value.getMinutes(),
                              0,
                              0,
                            );
                          }
                          field.onChange(selected);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="mt-1 flex items-center gap-2">
                    <InspectionDateTimePicker
                      date={field.value ?? new Date()}
                      isAllDay={isAllDay}
                      onDateChange={field.onChange}
                      onIsAllDayChange={checked =>
                        form.setValue('isAllDay', checked)
                      }
                    />
                  </div>

                  {isInFuture && (
                    <div className="rounded p-4">
                      <strong className="text-blue-500">
                        {t('inspection:form.futureScheduled')}
                      </strong>
                      <p className="text-blue-500">
                        {t('inspection:form.futureScheduledDescription')}
                      </p>
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(mode !== 'batch' ? !isInFuture : true) && (
            <>
              <hr className="border-t border-border" />
              <AudioSection
                inspectionId={inspectionId}
                pendingRecordings={pendingRecordings}
                onPendingRecordingsChange={setPendingRecordings}
              />

              <hr className="border-t border-border" />
              <PhotosSection
                inspectionId={inspectionId}
                pendingPhotos={pendingPhotos}
                onPendingPhotosChange={setPendingPhotos}
              />

              <hr className="border-t border-border" />
              <WeatherSection
                isAiSuggested={isAiSuggested}
                aiMergeState={aiMergeState}
                onAcceptSuggestion={acceptAiSuggestion}
                onDismissSuggestion={dismissAiSuggestion}
              />

              <hr className="border-t border-border" />
              <ObservationsSection
                isAiSuggested={isAiSuggested}
                aiMergeState={aiMergeState}
                onAcceptSuggestion={acceptAiSuggestion}
                onDismissSuggestion={dismissAiSuggestion}
              />

              <hr className="border-t border-border" />
              <ScorePreviewSection
                isAiSuggested={isAiSuggested}
                aiMergeState={aiMergeState}
                onAcceptSuggestion={acceptAiSuggestion}
                onDismissSuggestion={dismissAiSuggestion}
              />

              <hr className="border-t border-border" />
              <ActionsSection
                isAiSuggested={isAiSuggested}
                aiMergeState={aiMergeState}
                onAcceptSuggestion={acceptAiSuggestion}
                onDismissSuggestion={dismissAiSuggestion}
              />

              <hr className="border-t border-border" />
              <NotesSection
                isAiSuggested={isAiSuggested}
                aiMergeState={aiMergeState}
                onAcceptSuggestion={acceptAiSuggestion}
                onDismissSuggestion={dismissAiSuggestion}
              />
            </>
          )}

          {mode === 'batch' ? (
            <div className="flex gap-2">
              {showCancelButton && onCancel && (
                <Button
                  onClick={onCancel}
                  variant="outline"
                  type="button"
                  className="flex-1"
                >
                  {t('inspection:form.cancel')}
                </Button>
              )}
              <Button
                onClick={handleSave}
                type="submit"
                className="flex-1"
                data-umami-event="Batch Inspection Save and Next"
              >
                {submitButtonText || t('inspection:form.saveAndNext')}
              </Button>
            </div>
          ) : isEdit && !isCompleted ? (
            <>
              {fromScheduled ? (
                <Button
                  onClick={handleSave}
                  type="submit"
                  className="w-full"
                  variant="default"
                  disabled={isSubmitting}
                  data-umami-event="Inspection Complete"
                >
                  {isSubmitting
                    ? t('inspection:form.saving')
                    : t('inspection:form.completeInspection')}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    variant="outline"
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    data-umami-event="Inspection Save"
                  >
                    {isSubmitting
                      ? t('inspection:form.saving')
                      : t('inspection:form.save')}
                  </Button>
                  <Button
                    onClick={handleSaveAndComplete}
                    type="submit"
                    className="w-full"
                    variant="default"
                    disabled={isSubmitting}
                    data-umami-event="Inspection Complete"
                  >
                    {isSubmitting
                      ? t('inspection:form.saving')
                      : t('inspection:form.saveAndComplete')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <Button
              onClick={handleSave}
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              data-umami-event="Inspection Create"
            >
              {isSubmitting
                ? t('inspection:form.saving')
                : t('inspection:form.save')}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
};