import { Injectable } from '@nestjs/common';
import {
  ObservationSchemaType,
  ScoreResult,
  calculateScores,
} from 'shared-schemas';

@Injectable()
export class MetricsService {
  calculateOveralScore(inspectionMetrics: ObservationSchemaType): ScoreResult {
    return calculateScores(inspectionMetrics);
  }
}
