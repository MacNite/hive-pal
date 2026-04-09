import { ActionType } from 'shared-schemas';
import type { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema';

type AiDraft = {
  hive_name?: string;
  weather?: {
    temperature_c?: number | null;
    condition?: string;
  };
  queen_seen?: boolean | null;
  hive_strength?: {
    condition?: string | null;
    rating?: number | null;
  };
  capped_brood?: {
    present?: boolean | null;
    rating?: number | null;
  };
  uncapped_brood?: {
    present?: boolean | null;
    rating?: number | null;
  };
  brood_pattern?: string;
  honey_stores?: {
    present?: boolean | null;
    rating?: number | null;
  };
  pollen_stores?: {
    present?: boolean | null;
    rating?: number | null;
  };
  queen_cells?: {
    present?: boolean | null;
    rating?: number | null;
  };
  additional_observations?: string[];
  reminders?: string[];
  actions?: Array<{
    type?: string;
    details?: string;
  }>;
};

export type MappedAiDraft = {
  values: Partial<InspectionFormData>;
  suggestedFields: string[];
};

function normalizeWeatherCondition(
  value: string | undefined,
): InspectionFormData['weatherConditions'] | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'sunny':
    case 'clear':
      return 'sunny';
    case 'cloudy':
    case 'overcast':
      return 'cloudy';
    case 'partly cloudy':
      return 'partly-cloudy';
    case 'rain':
    case 'rainy':
      return 'rainy';
    case 'storm':
    case 'stormy':
    case 'thunderstorm':
      return 'stormy';
    case 'snow':
    case 'snowy':
      return 'snowy';
    case 'wind':
    case 'windy':
      return 'windy';
    default:
      return undefined;
  }
}

export function mapAiDraftToInspectionForm(
  draft: AiDraft | null | undefined,
): MappedAiDraft {
  const values: Partial<InspectionFormData> = {};
  const suggestedFields: string[] = [];

  if (!draft) {
    return { values, suggestedFields };
  }

  const mark = (field: keyof InspectionFormData) => {
    if (!suggestedFields.includes(field as string)) {
      suggestedFields.push(field as string);
    }
  };

  if (typeof draft.weather?.temperature_c === 'number') {
    values.temperature = draft.weather.temperature_c;
    mark('temperature');
  }

  const mappedWeather = normalizeWeatherCondition(draft.weather?.condition);
  if (mappedWeather) {
    values.weatherConditions = mappedWeather;
    mark('weatherConditions');
  }

  if (
    Array.isArray(draft.additional_observations) &&
    draft.additional_observations.length > 0
  ) {
    values.observations =
      draft.additional_observations as InspectionFormData['observations'];
    mark('observations');
  }

  const notesParts: string[] = [];

  if (typeof draft.queen_seen === 'boolean') {
    notesParts.push(`Queen seen: ${draft.queen_seen ? 'yes' : 'no'}`);
  }

  if (typeof draft.hive_strength?.rating === 'number') {
    notesParts.push(`Hive strength rating: ${draft.hive_strength.rating}/10`);
  }

  if (draft.hive_strength?.condition) {
    notesParts.push(`Hive strength condition: ${draft.hive_strength.condition}`);
  }

  if (draft.brood_pattern) {
    notesParts.push(`Brood pattern: ${draft.brood_pattern}`);
  }

  if (typeof draft.capped_brood?.present === 'boolean') {
    notesParts.push(`Capped brood present: ${draft.capped_brood.present ? 'yes' : 'no'}`);
  }

  if (typeof draft.uncapped_brood?.present === 'boolean') {
    notesParts.push(
      `Uncapped brood present: ${draft.uncapped_brood.present ? 'yes' : 'no'}`,
    );
  }

  if (typeof draft.honey_stores?.present === 'boolean') {
    notesParts.push(`Honey stores present: ${draft.honey_stores.present ? 'yes' : 'no'}`);
  }

  if (typeof draft.pollen_stores?.present === 'boolean') {
    notesParts.push(
      `Pollen stores present: ${draft.pollen_stores.present ? 'yes' : 'no'}`,
    );
  }

  if (typeof draft.queen_cells?.present === 'boolean') {
    notesParts.push(`Queen cells present: ${draft.queen_cells.present ? 'yes' : 'no'}`);
  }

  if (Array.isArray(draft.reminders) && draft.reminders.length > 0) {
    notesParts.push(`Reminders: ${draft.reminders.join(', ')}`);
  }

  if (notesParts.length > 0) {
    values.notes = notesParts.join('\n');
    mark('notes');
  }

  if (Array.isArray(draft.actions) && draft.actions.length > 0) {
    const mappedActions = draft.actions
      .map((action) => {
        if (!action?.details) return null;

        switch (action.type) {
          case 'feeding':
            return {
              type: ActionType.OTHER,
              notes: `Feeding: ${action.details}`,
            };

          case 'treatment':
            return {
              type: ActionType.OTHER,
              notes: `Treatment: ${action.details}`,
            };

          case 'frames':
            return {
              type: ActionType.OTHER,
              notes: `Frames: ${action.details}`,
            };

          case 'note':
          default:
            return {
              type: ActionType.OTHER,
              notes: action.details,
            };
        }
      })
      .filter(Boolean) as InspectionFormData['actions'];

    if (mappedActions.length > 0) {
      values.actions = mappedActions;
      mark('actions');
    }
  }

  return {
    values,
    suggestedFields,
  };
}