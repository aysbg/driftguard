import type { FindingSeverity, FindingConfidence } from '../types/finding.js';

export function dataModelExistsId(modelName: string, specFilePath: string): string {
  return `data-model-exists:${modelName}|${specFilePath}`;
}

export function businessRuleReferencedId(ruleId: string, specFilePath: string): string {
  return `business-rule-referenced:${ruleId}|${specFilePath}`;
}

export function storyUncoveredId(storyId: string, specFilePath: string): string {
  return `story-uncovered:${storyId}|${specFilePath}`;
}

export function extraRouteNotInSpecId(
  method: string,
  path: string,
  codeFilePath: string,
): string {
  return `extra-route-not-in-spec:${method}|${path}|${codeFilePath}`;
}

export const dataModelMissingSeverity: FindingSeverity = 'high';
export const businessRuleUnreferencedSeverity: FindingSeverity = 'medium';
export const storyUncoveredSeverity: FindingSeverity = 'low';
export const extraRouteSeverity: FindingSeverity = 'medium';

export const exactMatchConfidence: FindingConfidence = 'high';
export const heuristicConfidence: FindingConfidence = 'medium';