import type { DriftFinding } from '../types/finding.js';
import type { IndexedModel } from '../types/repository.js';
import type { DataModel } from '../types/spec.js';
import {
  dataModelExistsId,
  dataModelMissingSeverity,
  exactMatchConfidence,
} from './finding-conventions.js';

const MISSING_DATA_MODEL_EXPECTED = 'TypeScript interface or type alias declaration';
const MISSING_DATA_MODEL_FOUND = 'no matching declaration in code';
const MISSING_DATA_MODEL_REASON = 'Data model exists in spec but is not implemented in code';

export function evaluateDataModelExists(
  dataModels: DataModel[],
  codeModels: IndexedModel[],
): DriftFinding[] {
  return dataModels
    .filter((model) => !codeModels.some((codeModel) => codeModel.name === model.name))
    .map((model) => ({
      id: dataModelExistsId(model.name, model.filePath),
      summary: `Data model '${model.name}' is declared in spec but not found in code`,
      severity: dataModelMissingSeverity,
      confidence: exactMatchConfidence,
      mappingConfidence: 'medium' as const,
      affectedFiles: [model.filePath],
      specReferences: [model.filePath],
      explanation: {
        expected: MISSING_DATA_MODEL_EXPECTED,
        found: MISSING_DATA_MODEL_FOUND,
        reason: MISSING_DATA_MODEL_REASON,
      },
    }) satisfies DriftFinding)
    .sort((a, b) => a.id.localeCompare(b.id));
}
