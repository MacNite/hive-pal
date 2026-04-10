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
    case 'partly-cloudy':
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

function normalizeBroodPattern(
  value: string | undefined,
): InspectionFormData['observations']['broodPattern'] | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'solid':
    case 'excellent':
      return 'solid';
    case 'spotty':
    case 'patch':
    case 'patchy':
    case 'poor':
      return 'patchy';
    case 'scattered':
      return 'scattered';
    default:
      return undefined;
  }
}

function normalizeAdditionalObservation(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'calm':
    case 'defensive':
    case 'aggressive':
    case 'nervous':
    case 'healthy':
    case 'active':
    case 'sluggish':
    case 'thriving':
      return normalized;

    case 'varroa mites present':
      return 'varroa_present';
    case 'small hive beetle':
      return 'small_hive_beetle';
    case 'wax moths':
      return 'wax_moths';
    case 'ants present':
      return 'ants_present';

    default:
      return undefined;
  }
}

function normalizeReminder(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'honey bound':
      return 'honey_bound';
    case 'overcrowded':
      return 'overcrowded';
    case 'needs super':
      return 'needs_super';
    case 'queen issues':
      return 'queen_issues';
    case 'requires treatment':
      return 'requires_treatment';
    case 'low stores':
      return 'low_stores';
    case 'prepare for winter':
      return 'prepare_for_winter';
    default:
      return undefined;
  }
}

function ensureObservations(
  values: Partial<InspectionFormData>,
): NonNullable<InspectionFormData['observations']> {
  if (!values.observations) {
    values.observations = {} as InspectionFormData['observations'];
  }

  return values.observations as NonNullable<InspectionFormData['observations']>;
}

export function mapAiDraftToInspectionForm(
  draft: AiDraft | null | undefined,
): MappedAiDraft {
  const values: Partial<InspectionFormData> = {};
  const suggestedFields: string[] = [];
  const notesParts: string[] = [];

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

  const observations = ensureObservations(values);
  let hasObservationMappings = false;

  if (typeof draft.queen_seen === 'boolean') {
    observations.queenSeen = draft.queen_seen;
    hasObservationMappings = true;
  }

  if (typeof draft.hive_strength?.rating === 'number') {
    observations.strength = draft.hive_strength.rating;
    hasObservationMappings = true;
  }

  if (typeof draft.capped_brood?.rating === 'number') {
    observations.cappedBrood = draft.capped_brood.rating;
    hasObservationMappings = true;
  }

  if (typeof draft.uncapped_brood?.rating === 'number') {
    observations.uncappedBrood = draft.uncapped_brood.rating;
    hasObservationMappings = true;
  }

  const mappedBroodPattern = normalizeBroodPattern(draft.brood_pattern);
  if (mappedBroodPattern) {
    observations.broodPattern = mappedBroodPattern;
    hasObservationMappings = true;
  }

  if (typeof draft.honey_stores?.rating === 'number') {
    observations.honeyStores = draft.honey_stores.rating;
    hasObservationMappings = true;
  }

  if (typeof draft.pollen_stores?.rating === 'number') {
    observations.pollenStores = draft.pollen_stores.rating;
    hasObservationMappings = true;
  }

  if (typeof draft.queen_cells?.rating === 'number') {
    observations.queenCells = draft.queen_cells.rating;
    hasObservationMappings = true;
  }

  if (Array.isArray(draft.additional_observations) && draft.additional_observations.length > 0) {
    const mappedObservationFlags = draft.additional_observations
      .map(normalizeAdditionalObservation)
      .filter(Boolean) as string[];

    if (mappedObservationFlags.length > 0) {
      observations.additionalObservations = mappedObservationFlags as InspectionFormData['observations']['additionalObservations'];
      hasObservationMappings = true;
    }

    const unmappedObservationText = draft.additional_observations.filter(
      (item) => !normalizeAdditionalObservation(item),
    );

    if (unmappedObservationText.length > 0) {
      notesParts.push(
        `Additional observations: ${unmappedObservationText.join(', ')}`,
      );
    }
  }

  if (hasObservationMappings) {
    mark('observations');
  } else {
    delete values.observations;
  }

  if (draft.hive_strength?.condition) {
    notesParts.push(`Hive strength condition: ${draft.hive_strength.condition}`);
  }

  if (
    typeof draft.capped_brood?.present === 'boolean' &&
    typeof draft.capped_brood?.rating !== 'number'
  ) {
    notesParts.push(
      `Capped brood present: ${draft.capped_brood.present ? 'yes' : 'no'}`,
    );
  }

  if (
    typeof draft.uncapped_brood?.present === 'boolean' &&
    typeof draft.uncapped_brood?.rating !== 'number'
  ) {
    notesParts.push(
      `Uncapped brood present: ${draft.uncapped_brood.present ? 'yes' : 'no'}`,
    );
  }

  if (
    typeof draft.honey_stores?.present === 'boolean' &&
    typeof draft.honey_stores?.rating !== 'number'
  ) {
    notesParts.push(
      `Honey stores present: ${draft.honey_stores.present ? 'yes' : 'no'}`,
    );
  }

  if (
    typeof draft.pollen_stores?.present === 'boolean' &&
    typeof draft.pollen_stores?.rating !== 'number'
  ) {
    notesParts.push(
      `Pollen stores present: ${draft.pollen_stores.present ? 'yes' : 'no'}`,
    );
  }

  if (
    typeof draft.queen_cells?.present === 'boolean' &&
    typeof draft.queen_cells?.rating !== 'number'
  ) {
    notesParts.push(
      `Queen cells present: ${draft.queen_cells.present ? 'yes' : 'no'}`,
    );
  }

  if (Array.isArray(draft.reminders) && draft.reminders.length > 0) {
    const normalizedReminders = draft.reminders
      .map(normalizeReminder)
      .filter(Boolean) as string[];

    if (normalizedReminders.length > 0) {
      notesParts.push(`Reminders: ${normalizedReminders.join(', ')}`);
    }
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

  if (notesParts.length > 0) {
    values.notes = notesParts.join('\n');
    mark('notes');
  }

  return {
    values,
    suggestedFields,
  };
}