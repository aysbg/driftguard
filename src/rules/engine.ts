import { evaluateOpenApiRouteExists } from './openapi-route-exists.js';
import { evaluateSectionUnmapped } from './markdown-section-unmapped.js';
import { evaluateDataModelExists } from './data-model-exists.js';
import { evaluateBusinessRuleReferenced } from './business-rule-referenced.js';
import { evaluateStoryUncovered } from './story-uncovered.js';
import { extraRouteNotInSpecId, extraRouteSeverity, exactMatchConfidence, heuristicConfidence } from './finding-conventions.js';
import type { Mapping, MappingConfidence, DriftFinding, SectionMapping } from '../types/finding.js';
import type { ParseWarning, UnifiedSpecIR } from '../types/spec.js';
import type { RepositoryIndexResult } from '../repository/indexer.js';
import type { RouteMappingResult } from '../mapping/mapper.js';

export interface RuleEngineResult {
  mappings: Mapping[];
  sectionMappings?: SectionMapping[];
  findings: DriftFinding[];
  warnings: ParseWarning[];
}

export function runRuleEngine(input: {
  spec: UnifiedSpecIR;
  repository: RepositoryIndexResult;
  mappingResult: RouteMappingResult;
  sectionMappings?: SectionMapping[];
}): RuleEngineResult {
  const routeFindings = evaluateOpenApiRouteExists(input.mappingResult.mappings, input.repository.index);
  const sectionFindings = input.sectionMappings === undefined ? [] : evaluateSectionUnmapped(input.sectionMappings);
  const surplusRouteFindings: DriftFinding[] = input.mappingResult.unmatchedRoutes.map((route) => ({
    id: extraRouteNotInSpecId(route.method, route.path, route.filePath),
    summary: 'Route implementation exists with no matching spec operation',
    severity: extraRouteSeverity,
    confidence: exactMatchConfidence,
    mappingConfidence: heuristicConfidence as MappingConfidence,
    method: route.method,
    path: route.path,
    affectedFiles: [route.filePath],
    specReferences: [],
    explanation: {
      expected: 'matching spec operation',
      found: 'no spec operation for this route',
      reason: 'extra route in code not documented in spec',
    },
  }));
  const dataModels = input.spec.documents.flatMap((document) => document.dataModels ?? []);
  const businessRules = input.spec.documents.flatMap((document) => document.businessRules ?? []);
  const stories = input.spec.documents.flatMap((document) => document.stories ?? []);
  const codeModels = input.repository.index.files.flatMap((file) => [...file.models ?? [], ...file.types ?? []]);

  const dataModelFindings = evaluateDataModelExists(dataModels, codeModels);
  const businessRuleFindings = evaluateBusinessRuleReferenced(businessRules, input.repository.index);
  const intermediateFindings = [
    ...routeFindings,
    ...sectionFindings,
    ...surplusRouteFindings,
    ...dataModelFindings,
    ...businessRuleFindings,
  ];
  const storyFindings = evaluateStoryUncovered(stories, intermediateFindings);
  const findings = [...intermediateFindings, ...storyFindings].sort((left, right) =>
    left.id.localeCompare(right.id)
  );

  return {
    mappings: input.mappingResult.mappings,
    sectionMappings: input.sectionMappings,
    findings,
    warnings: [
      ...input.spec.parseWarnings,
      ...input.repository.warnings,
    ],
  };
}
