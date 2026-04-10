import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx';
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react';
import { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema.ts';
import { useFormContext } from 'react-hook-form';
import { TemperatureField } from '@/components/common';
import { AiBadge } from './ai-badge';
import { AiFieldControls } from './ai-field-controls';
import { AiMergeState } from '@/pages/inspection/lib/inspection-ai-merge';

const weatherConditions = [
  {
    id: 'sunny',
    label: 'Sunny',
    icon: Sun,
    style: 'bg-background border-border hover:border-amber-600',
    styleActive: 'bg-amber-50 border-amber-400',
    iconStyle: 'text-amber-400',
    iconStyleActive: 'text-amber-600',
  },
  {
    id: 'partly-cloudy',
    label: 'Partly cloudy',
    icon: CloudSun,
    style: 'bg-background border-border hover:border-gray-600',
    styleActive: 'bg-blue-50 border-gray-600',
    iconStyle: 'text-amber-800',
    iconStyleActive: 'text-amber-400',
  },
  {
    id: 'cloudy',
    label: 'Cloudy',
    icon: Cloud,
    style: 'bg-background border-border hover:border-gray-800',
    styleActive: 'bg-gray-100 border-gray-600',
    iconStyle: 'text-gray-400',
    iconStyleActive: 'text-gray-600',
  },
  {
    id: 'rainy',
    label: 'Rainy',
    icon: CloudRain,
    style: 'bg-background border-border hover:border-blue-800',
    styleActive: 'bg-blue-100 border-blue-900',
    iconStyle: 'text-blue-600 hover:text-blue-400',
    iconStyleActive: 'text-blue-800',
  },
];

type WeatherSectionProps = {
  isAiSuggested?: (field: keyof InspectionFormData) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: keyof InspectionFormData) => void;
  onDismissSuggestion?: (field: keyof InspectionFormData) => void;
};

export const WeatherSection = ({
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}: WeatherSectionProps) => {
  const { t } = useTranslation('inspection');
  const form = useFormContext<InspectionFormData>();

  const weatherLabels: Record<string, string> = {
    sunny: t('inspection:form.weather.sunny'),
    'partly-cloudy': t('inspection:form.weather.partlyCloudy'),
    cloudy: t('inspection:form.weather.cloudy'),
    rainy: t('inspection:form.weather.rainy'),
  };

  return (
    <div>
      <h3 className="text-lg font-medium">{t('inspection:form.weather.title')}</h3>
      <p className="text-sm text-gray-400">
        {t('inspection:form.weather.description')}
      </p>

      <div className="grid grid-cols-1 space-y-4 py-4">
        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('inspection:form.weather.temperature')}
                {isAiSuggested?.('temperature') && <AiBadge />}
              </FormLabel>

              <TemperatureField
                onChange={field.onChange}
                min={0}
                value={field.value ?? null}
                name={field.name}
                max={55}
                onBlur={field.onBlur}
              />

              <AiFieldControls
                isVisible={Boolean(aiMergeState?.suggestions.temperature)}
                hasConflict={aiMergeState?.suggestions.temperature?.hasConflict}
                status={aiMergeState?.suggestions.temperature?.status}
                onAccept={() => onAcceptSuggestion?.('temperature')}
                onDismiss={() => onDismissSuggestion?.('temperature')}
              />

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weatherConditions"
          rules={{ required: 'Please select a weather condition' }}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>
                {t('inspection:form.weather.condition')}
                {isAiSuggested?.('weatherConditions') && <AiBadge />}
              </FormLabel>

              <FormControl>
                <div className="flex flex-wrap justify-start gap-3">
                  {weatherConditions.map(condition => {
                    const Icon = condition.icon;
                    const isSelected = field.value === condition.id;

                    return (
                      <button
                        type="button"
                        key={condition.id}
                        onClick={() => field.onChange(condition.id)}
                        onKeyDown={() => {}}
                        className={`
                          flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 transition-all
                          ${isSelected ? condition.styleActive : condition.style}
                        `}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            isSelected
                              ? condition.iconStyleActive
                              : condition.iconStyle
                          }`}
                        />
                        <span className="text-sm font-medium">
                          {weatherLabels[condition.id] || condition.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FormControl>

              <AiFieldControls
                isVisible={Boolean(aiMergeState?.suggestions.weatherConditions)}
                hasConflict={aiMergeState?.suggestions.weatherConditions?.hasConflict}
                status={aiMergeState?.suggestions.weatherConditions?.status}
                onAccept={() => onAcceptSuggestion?.('weatherConditions')}
                onDismiss={() => onDismissSuggestion?.('weatherConditions')}
              />

              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};