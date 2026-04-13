import { ActionType } from 'shared-schemas';
import type { InspectionFormData } from '@/pages/inspection/components/inspection-form/schema';

type LegacyAiDraft = {
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

type NewAiAction =
  | {
      type?: string;
      notes?: string | null;
      details?: {
        type?: string;
        feedType?: string | null;
        amount?: number | null;
        unit?: string | null;
        concentration?: string | null;
        product?: string | null;
        quantity?: number | null;
        duration?: string | null;
        component?: string | null;
        status?: string | null;
        content?: string | null;
      } | null;
    }
  | {
      type?: string;
      notes?: string | null;
      feedType?: string | null;
      quantity?: number | null;
      amount?: number | null;
      unit?: string | null;
      concentration?: string | null;
      treatmentType?: string | null;
      frames?: number | null;
      component?: string | null;
      status?: string | null;
    };

type NewAiDraft = Partial<InspectionFormData> & {
  actions?: NewAiAction[];
};

type AiDraft = LegacyAiDraft | NewAiDraft | null | undefined;

export type MappedAiDraft = {
  values: Partial<InspectionFormData>;
  suggestedFields: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function flattenSuggestedFields(
  value: Record<string, unknown>,
  prefix = '',
): string[] {
  const result: string[] = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(nestedValue)) {
      result.push(...flattenSuggestedFields(nestedValue, path));
      continue;
    }

    if (isMeaningfulValue(nestedValue)) {
      result.push(path);
    }
  }

  return result;
}

function normalizeWeatherCondition(
  value: string | null | undefined,
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
  value: string | null | undefined,
): InspectionFormData['observations']['broodPattern'] | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'solid':
      return 'solid';
    case 'spotty':
      return 'spotty';
    case 'scattered':
      return 'scattered';
    case 'patch':
    case 'patchy':
      return 'patchy';
    case 'excellent':
      return 'excellent';
    case 'poor':
      return 'poor';
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
    case 'varroa_present':
      return 'varroa_present';
    case 'small hive beetle':
    case 'small_hive_beetle':
      return 'small_hive_beetle';
    case 'wax moths':
    case 'wax_moths':
      return 'wax_moths';
    case 'ants present':
    case 'ants_present':
      return 'ants_present';
    default:
      return undefined;
  }
}

function normalizeReminder(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'honey bound':
    case 'honey_bound':
      return 'honey_bound';
    case 'overcrowded':
      return 'overcrowded';
    case 'needs super':
    case 'needs_super':
      return 'needs_super';
    case 'queen issues':
    case 'queen_issues':
      return 'queen_issues';
    case 'requires treatment':
    case 'requires_treatment':
      return 'requires_treatment';
    case 'low stores':
    case 'low_stores':
      return 'low_stores';
    case 'prepare for winter':
    case 'prepare_for_winter':
      return 'prepare_for_winter';
    default:
      return undefined;
  }
}

function mapNewActions(actions: NewAiAction[] | undefined): InspectionFormData['actions'] {
  if (!Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  return actions
    .map(action => {
      if (!action?.type) return null;

      const type = action.type;

      if (type === ActionType.FEEDING || type === 'FEEDING') {
        const details = 'details' in action ? action.details : undefined;

        return {
          type: ActionType.FEEDING,
          notes: action.notes ?? '',
          feedType:
            details?.feedType ??
            ('feedType' in action ? action.feedType ?? '' : ''),
          quantity:
            details?.amount ??
            ('quantity' in action ? action.quantity ?? null : null),
          unit:
            details?.unit ??
            ('unit' in action ? action.unit ?? '' : ''),
          concentration:
            details?.concentration ??
            ('concentration' in action ? action.concentration ?? '' : ''),
        };
      }

      if (type === ActionType.TREATMENT || type === 'TREATMENT') {
        const details = 'details' in action ? action.details : undefined;

        return {
          type: ActionType.TREATMENT,
          notes: action.notes ?? '',
          treatmentType:
            details?.product ??
            ('treatmentType' in action ? action.treatmentType ?? '' : ''),
          amount:
            details?.quantity ??
            ('amount' in action ? action.amount ?? null : null),
          unit:
            details?.unit ??
            ('unit' in action ? action.unit ?? '' : ''),
        };
      }

      if (type === ActionType.FRAME || type === 'FRAME') {
        const details = 'details' in action ? action.details : undefined;

        return {
          type: ActionType.FRAME,
          notes: action.notes ?? '',
          frames:
            details?.quantity ??
            ('frames' in action ? action.frames ?? null : null),
        };
      }

      if (type === ActionType.MAINTENANCE || type === 'MAINTENANCE') {
        const details = 'details' in action ? action.details : undefined;

        return {
          type: ActionType.MAINTENANCE,
          notes: action.notes ?? '',
          component:
            details?.component ??
            ('component' in action ? action.component ?? '' : ''),
          status:
            details?.status ??
            ('status' in action ? action.status ?? '' : ''),
        };
      }

      if (type === ActionType.NOTE || type === 'NOTE') {
        const details = 'details' in action ? action.details : undefined;

        return {
          type: ActionType.NOTE,
          notes: details?.content ?? action.notes ?? '',
        };
      }

      return {
        type: ActionType.OTHER,
        notes: action.notes ?? '',
      };
    })
    .filter(Boolean) as InspectionFormData['actions'];
}

function mapNewSchemaDraft(draft: NewAiDraft): MappedAiDraft {
  const values: Partial<InspectionFormData> = {};

  if (typeof draft.temperature === 'number') {
    values.temperature = draft.temperature;
  }

  if (typeof draft.weatherConditions === 'string' && draft.weatherConditions.trim() !== '') {
    values.weatherConditions = draft.weatherConditions;
  }

  if (typeof draft.notes === 'string' && draft.notes.trim() !== '') {
    values.notes = draft.notes;
  }

  if (draft.observations && isPlainObject(draft.observations)) {
    const observations: NonNullable<InspectionFormData['observations']> = {};

    if (typeof draft.observations.strength === 'number') {
      observations.strength = draft.observations.strength;
    }

    if (typeof draft.observations.uncappedBrood === 'number') {
      observations.uncappedBrood = draft.observations.uncappedBrood;
    }

    if (typeof draft.observations.cappedBrood === 'number') {
      observations.cappedBrood = draft.observations.cappedBrood;
    }

    if (typeof draft.observations.honeyStores === 'number') {
      observations.honeyStores = draft.observations.honeyStores;
    }

    if (typeof draft.observations.pollenStores === 'number') {
      observations.pollenStores = draft.observations.pollenStores;
    }

    if (typeof draft.observations.queenCells === 'number') {
      observations.queenCells = draft.observations.queenCells;
    }

    if (typeof draft.observations.swarmCells === 'boolean') {
      observations.swarmCells = draft.observations.swarmCells;
    }

    if (typeof draft.observations.supersedureCells === 'boolean') {
      observations.supersedureCells = draft.observations.supersedureCells;
    }

    if (typeof draft.observations.queenSeen === 'boolean') {
      observations.queenSeen = draft.observations.queenSeen;
    }

    const broodPattern = normalizeBroodPattern(draft.observations.broodPattern);
    if (broodPattern) {
      observations.broodPattern = broodPattern;
    }

    if (Array.isArray(draft.observations.additionalObservations)) {
      const normalized = draft.observations.additionalObservations
        .map(normalizeAdditionalObservation)
        .filter(Boolean) as NonNullable<
        InspectionFormData['observations']
      >['additionalObservations'];

      if (normalized.length > 0) {
        observations.additionalObservations = normalized;
      }
    }

    if (Array.isArray(draft.observations.reminderObservations)) {
      const normalized = draft.observations.reminderObservations
        .map(normalizeReminder)
        .filter(Boolean) as NonNullable<
        InspectionFormData['observations']
      >['reminderObservations'];

      if (normalized.length > 0) {
        observations.reminderObservations = normalized;
      }
    }

    if (Object.keys(observations).length > 0) {
      values.observations = observations;
    }
  }

  const mappedActions = mapNewActions(draft.actions);
  if (mappedActions.length > 0) {
    values.actions = mappedActions;
  }

  return {
    values,
    suggestedFields: flattenSuggestedFields(values as Record<string, unknown>),
  };
}

function ensureObservations(
  values: Partial<InspectionFormData>,
): NonNullable<InspectionFormData['observations']> {
  if (!values.observations) {
    values.observations = {} as InspectionFormData['observations'];
  }

  return values.observations as NonNullable<InspectionFormData['observations']>;
}

function mapLegacyDraft(draft: LegacyAiDraft): MappedAiDraft {
  const values: Partial<InspectionFormData> = {};
  const notesParts: string[] = [];

  if (typeof draft.weather?.temperature_c === 'number') {
    values.temperature = draft.weather.temperature_c;
  }

  const mappedWeather = normalizeWeatherCondition(draft.weather?.condition);
  if (mappedWeather) {
    values.weatherConditions = mappedWeather;
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
      .filter(Boolean) as NonNullable<
      InspectionFormData['observations']
    >['additionalObservations'];

    if (mappedObservationFlags.length > 0) {
      observations.additionalObservations = mappedObservationFlags;
      hasObservationMappings = true;
    }
  }

  if (Array.isArray(draft.reminders) && draft.reminders.length > 0) {
    const normalizedReminders = draft.reminders
      .map(normalizeReminder)
      .filter(Boolean) as NonNullable<
      InspectionFormData['observations']
    >['reminderObservations'];

    if (normalizedReminders.length > 0) {
      observations.reminderObservations = normalizedReminders;
      hasObservationMappings = true;
    }
  }

  if (!hasObservationMappings) {
    delete values.observations;
  }

  if (draft.hive_strength?.condition) {
    notesParts.push(`Hive strength condition: ${draft.hive_strength.condition}`);
  }

  if (Array.isArray(draft.actions) && draft.actions.length > 0) {
    const mappedActions = draft.actions
      .map(action => {
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
    }
  }

  if (notesParts.length > 0 && !values.notes) {
    values.notes = notesParts.join('\n');
  }

  return {
    values,
    suggestedFields: flattenSuggestedFields(values as Record<string, unknown>),
  };
}

function looksLikeNewSchemaDraft(draft: AiDraft): draft is NewAiDraft {
  if (!draft || !isPlainObject(draft)) return false;

  return (
    'temperature' in draft ||
    'weatherConditions' in draft ||
    'notes' in draft ||
    'observations' in draft ||
    'actions' in draft
  );
}

export function mapAiDraftToInspectionForm(
  draft: AiDraft,
): MappedAiDraft {
  if (!draft || !isPlainObject(draft)) {
    return { values: {}, suggestedFields: [] };
  }

  if (looksLikeNewSchemaDraft(draft)) {
    return mapNewSchemaDraft(draft);
  }

  return mapLegacyDraft(draft as LegacyAiDraft);
}