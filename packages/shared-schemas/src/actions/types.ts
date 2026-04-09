import { z } from 'zod';

export enum ActionType {
  FEEDING = 'FEEDING',
  TREATMENT = 'TREATMENT',
  FRAME = 'FRAME',
  HARVEST = 'HARVEST',
  BOX_CONFIGURATION = 'BOX_CONFIGURATION',
  MAINTENANCE = 'MAINTENANCE',
  NOTE = 'NOTE',
  OTHER = 'OTHER',
}

export const actionTypeSchema = z.nativeEnum(ActionType);
