import React, { useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { calculateScores, ScoreResult } from 'shared-schemas';
import { Pencil, RotateCcw, X, BarChart, CrownIcon } from 'lucide-react';
import { BeeIcon } from '@/components/common/bee-icon.tsx';
import { IconJarLogoIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InspectionFormData } from './schema';

type ScoreKey = 'overallScore' | 'populationScore' | 'storesScore' | 'queenScore';

const getScoreColor = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'text-muted-foreground';
  if (value >= 6) return 'text-green-600';
  if (value >= 3) return 'text-amber-500';
  return 'text-red-500';
};

const ScoreItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  calculatedValue: number | null;
  overrideValue: number | null | undefined;
  onOverride: (value: number | null) => void;
  onClear: () => void;
}> = ({ label, icon, calculatedValue, overrideValue, onOverride, onClear }) => {
  const { t } = useTranslation('inspection');
  const [editing, setEditing] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const isOverridden = overrideValue !== undefined && overrideValue !== null && overrideValue !== calculatedValue;
  const displayValue = isOverridden ? overrideValue : calculatedValue;
  const ratingValue = overrideValue ?? calculatedValue;

  return (
    <div className="rounded-md border bg-card p-2 space-y-2">
      {/* Header row: icon + label + score + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-sm text-muted-foreground truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold ${getScoreColor(displayValue)}`}>
            {displayValue?.toFixed(1) ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">/10</span>
          {isOverridden && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
              onClick={e => {
                e.preventDefault();
                onClear();
                setEditing(false);
              }}
              title={`Calculated: ${calculatedValue?.toFixed(1) ?? '—'}`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            className={`ml-0.5 ${editing ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={e => {
              e.preventDefault();
              setEditing(!editing);
            }}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Rating bar + input row (shown when editing) */}
      {editing && (
        <div className="flex items-center">
          {/* Zero value button */}
          <button
            type="button"
            className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2 ${
              ratingValue === 0
                ? 'bg-gray-600 text-white dark:bg-gray-300 dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
            onClick={e => {
              e.preventDefault();
              onOverride(0);
            }}
            aria-label={t('observations.rateAs', { value: 0 })}
          >
            0
          </button>

          {/* Rating buttons */}
          <div className="grow grid grid-cols-10 gap-1 h-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fullValue => {
              let color = 'bg-gray-200 dark:bg-gray-700';
              if (hoveredValue != null && hoveredValue >= fullValue) {
                color = 'bg-amber-200 dark:bg-amber-800';
              } else if (ratingValue != null && ratingValue >= fullValue) {
                color = 'bg-amber-300 dark:bg-amber-700';
              }

              return (
                <button
                  key={fullValue}
                  type="button"
                  className={`rounded w-full duration-300 transition-colors text-xs ${color} ${hoveredValue === fullValue ? 'text-gray-700 dark:text-gray-300' : 'text-transparent'}`}
                  onMouseEnter={() => setHoveredValue(fullValue)}
                  onMouseLeave={() => setHoveredValue(null)}
                  onClick={e => {
                    e.preventDefault();
                    onOverride(fullValue);
                    setHoveredValue(null);
                  }}
                  aria-label={t('observations.rateAs', { value: fullValue })}
                >
                  {hoveredValue === fullValue && hoveredValue}
                </button>
              );
            })}
          </div>

          {/* Numeric input */}
          <Input
            type="number"
            min={0}
            max={10}
            step={0.1}
            className="ml-2 w-16 h-8 text-sm text-center"
            value={ratingValue ?? ''}
            onChange={e => {
              const val = e.target.value === '' ? null : parseFloat(e.target.value);
              if (val !== null && (val < 0 || val > 10)) return;
              onOverride(val !== null ? Math.round(val * 100) / 100 : null);
            }}
          />

          {/* Clear button */}
          <Button
            variant="ghost"
            type="button"
            disabled={ratingValue == null}
            className="ml-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
            onClick={e => {
              e.preventDefault();
              onOverride(null);
            }}
            aria-label={t('observations.clearRating')}
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  );
};

export const ScorePreviewSection: React.FC = () => {
  const { t } = useTranslation('inspection');
  const { setValue, control } = useFormContext<InspectionFormData>();

  const observations = useWatch({ name: 'observations', control });
  const scoreForm = useWatch({ name: 'score', control });

  const calculated: ScoreResult = useMemo(() => {
    if (!observations) {
      return {
        overallScore: null,
        populationScore: null,
        storesScore: null,
        queenScore: null,
        warnings: [],
        confidence: 0,
      };
    }
    return calculateScores(observations);
  }, [observations]);

  const hasAnyScore =
    calculated.overallScore !== null ||
    calculated.populationScore !== null ||
    calculated.storesScore !== null ||
    calculated.queenScore !== null ||
    scoreForm?.overallScore != null ||
    scoreForm?.populationScore != null ||
    scoreForm?.storesScore != null ||
    scoreForm?.queenScore != null;

  if (!hasAnyScore) return null;

  const hasOverrides =
    scoreForm &&
    ((scoreForm.overallScore != null && scoreForm.overallScore !== calculated.overallScore) ||
      (scoreForm.populationScore != null && scoreForm.populationScore !== calculated.populationScore) ||
      (scoreForm.storesScore != null && scoreForm.storesScore !== calculated.storesScore) ||
      (scoreForm.queenScore != null && scoreForm.queenScore !== calculated.queenScore));

  const setScoreField = (key: ScoreKey, value: number | null) => {
    setValue(`score.${key}`, value, { shouldDirty: true });
  };

  const clearOverride = (key: ScoreKey) => {
    setValue(`score.${key}`, undefined, { shouldDirty: true });
  };

  const resetAll = () => {
    setValue('score', undefined, { shouldDirty: true });
  };

  const scores: { key: ScoreKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overallScore', label: t('scores.overall'), icon: <BarChart className="h-4 w-4 text-amber-500" /> },
    { key: 'populationScore', label: t('scores.population'), icon: <BeeIcon className="h-4 w-4 text-blue-500" /> },
    { key: 'storesScore', label: t('scores.stores'), icon: <IconJarLogoIcon className="h-4 w-4 text-purple-500" /> },
    { key: 'queenScore', label: t('scores.queen'), icon: <CrownIcon className="h-4 w-4 text-green-500" /> },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('scores.title')}</h3>
        {hasOverrides && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={e => {
              e.preventDefault();
              resetAll();
            }}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {t('scores.resetToCalculated')}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {scores.map(({ key, label, icon }) => (
          <ScoreItem
            key={key}
            label={label}
            icon={icon}
            calculatedValue={calculated[key]}
            overrideValue={scoreForm?.[key]}
            onOverride={val => setScoreField(key, val)}
            onClear={() => clearOverride(key)}
          />
        ))}
      </div>
    </div>
  );
};
