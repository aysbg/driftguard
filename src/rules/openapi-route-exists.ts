import { selectAffectedFileForPath } from '../mapping/mapper.js';
import type { Mapping, DriftFinding } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';

const MISSING_ROUTE_SUMMARY = 'OpenAPI operation is not implemented by an indexed route';
const MISSING_ROUTE_FOUND = 'No matching route implementation found in code';
const MISSING_ROUTE_REASON = 'The documented API operation has no corresponding route handler';

export function evaluateOpenApiRouteExists(mappings: Mapping[], repositoryIndex: RepositoryIndex): DriftFinding[] {
  return mappings
    .filter((mapping) => mapping.codeRoute === null)
    .map((mapping) => {
      const affectedFile = selectAffectedFileForPath(mapping.specOperation.path, repositoryIndex);
      const specCitations = mapping.specCitation === undefined ? undefined : [mapping.specCitation];
      const codeEvidence = mapping.codeEvidence === undefined ? undefined : [mapping.codeEvidence];

      return {
        id: `openapi-route-exists:${mapping.specOperation.method}|${mapping.specOperation.path}|${mapping.specOperation.filePath}`,
        summary: MISSING_ROUTE_SUMMARY,
        severity: 'high',
        confidence: 'high',
        mappingConfidence: affectedFile.confidence,
        method: mapping.specOperation.method,
        path: mapping.specOperation.path,
        affectedFiles: affectedFile.filePath === null ? [] : [affectedFile.filePath],
        specReferences: [mapping.specOperation.filePath],
        specCitations,
        codeEvidence,
        explanation: {
          expected: buildExpectedMessage(mapping.specOperation.method, mapping.specOperation.path),
          found: MISSING_ROUTE_FOUND,
          reason: MISSING_ROUTE_REASON,
        },
      } satisfies DriftFinding;
    });
}

function buildExpectedMessage(method: string, path: string): string {
  const parameterContext = toPathParameterContext(path);

  return `OpenAPI defines ${method} ${path}${parameterContext}`;
}

function toPathParameterContext(path: string): string {
  const parameterNames = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);

  if (parameterNames.length === 0) {
    return '';
  }

  const renderedParameters = parameterNames.map((name) => `path: ${name}`).join(', ');

  return ` with parameters [${renderedParameters}]`;
}
