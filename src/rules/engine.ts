import { evaluateOpenApiRouteExists } from './openapi-route-exists.js';
import { evaluateSectionUnmapped } from './markdown-section-unmapped.js';
import type { Mapping, DriftFinding, SectionMapping } from '../types/finding.js';
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
  const findings = [...routeFindings, ...sectionFindings].sort((left, right) => left.id.localeCompare(right.id));

  return {
    mappings: input.mappingResult.mappings,
    sectionMappings: input.sectionMappings,
    findings,
    warnings: [
      ...input.spec.parseWarnings,
      ...input.repository.warnings,
      ...input.mappingResult.unmatchedRoutes.map((route) => ({
        filePath: route.filePath,
        message: `extra_route_not_in_spec: ${route.method} ${route.path}`,
      })),
    ],
  };
}
