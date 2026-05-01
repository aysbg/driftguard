import type { Mapping, MappingConfidence } from '../types/finding.js';
import type { IndexedFile, IndexedRoute, RepositoryIndex } from '../types/repository.js';
import type { UnifiedSpecIR } from '../types/spec.js';

export interface RouteMappingResult {
  mappings: Mapping[];
  unmatchedRoutes: IndexedRoute[];
}

export interface AffectedFileMatch {
  filePath: string | null;
  confidence: MappingConfidence;
}

export function mapOpenApiOperationsToRoutes(spec: UnifiedSpecIR, repositoryIndex: RepositoryIndex): RouteMappingResult {
  const routes = repositoryIndex.files.flatMap((file) => file.routes);
  const routesByKey = new Map<string, IndexedRoute[]>();

  for (const route of routes) {
    const key = toOperationKey(route.method, route.path);
    const existingRoutes = routesByKey.get(key) ?? [];
    existingRoutes.push(route);
    routesByKey.set(key, existingRoutes);
  }

  const matchedRouteIds = new Set<string>();
  const mappings = spec.documents
    .flatMap((document) => document.operations)
    .map((operation) => {
      const key = toOperationKey(operation.method, operation.path);
      const matchedRoute = (routesByKey.get(key) ?? []).find((route) => !matchedRouteIds.has(toRouteId(route)));
      const specCitation = {
        filePath: operation.filePath,
        sectionOrOperation: `${operation.method} ${operation.path}`,
      };

      if (matchedRoute) {
        matchedRouteIds.add(toRouteId(matchedRoute));

        return {
          specOperation: {
            filePath: operation.filePath,
            method: operation.method,
            path: operation.path,
          },
          codeRoute: {
            filePath: matchedRoute.filePath,
            method: matchedRoute.method,
            path: matchedRoute.path,
          },
          confidence: 'medium',
          specCitation,
          codeEvidence: {
            filePath: matchedRoute.filePath,
            startLine: matchedRoute.line,
            snippet: matchedRoute.snippet,
          },
        } satisfies Mapping;
      }

      const affectedFile = selectAffectedFileForPath(operation.path, repositoryIndex);

      return {
        specOperation: {
          filePath: operation.filePath,
          method: operation.method,
          path: operation.path,
        },
        codeRoute: null,
        confidence: affectedFile.confidence,
        specCitation,
        codeEvidence: affectedFile.filePath === null ? undefined : { filePath: affectedFile.filePath },
      } satisfies Mapping;
    });

  return {
    mappings,
    unmatchedRoutes: routes.filter((route) => !matchedRouteIds.has(toRouteId(route))),
  };
}

export function selectAffectedFileForPath(path: string, repositoryIndex: RepositoryIndex): AffectedFileMatch {
  const pathTokens = toPathTokens(path);
  let bestFile: IndexedFile | null = null;
  let bestScore = -1;

  for (const file of repositoryIndex.files) {
    const score = scoreFileAgainstPath(pathTokens, file.filePath);

    if (score > bestScore || (score === bestScore && bestFile !== null && file.filePath.localeCompare(bestFile.filePath) < 0)) {
      bestFile = file;
      bestScore = score;
    }
  }

  if (bestFile === null) {
    return {
      filePath: null,
      confidence: 'low',
    };
  }

  return {
    filePath: bestFile.filePath,
    confidence: bestScore > 0 ? 'medium' : 'low',
  };
}

function scoreFileAgainstPath(pathTokens: string[], filePath: string): number {
  const fileTokens = new Set(tokenize(filePath));

  return pathTokens.reduce((score, token) => score + (fileTokens.has(token) ? 1 : 0), 0);
}

export function toPathTokens(path: string): string[] {
  return path
    .split('/')
    .flatMap((segment) => {
      if (!segment || (segment.startsWith('{') && segment.endsWith('}'))) {
        return [];
      }

      return tokenize(segment);
    });
}

export function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
}

function toOperationKey(method: string, path: string): string {
  return `${method}|${path}`;
}

function toRouteId(route: IndexedRoute): string {
  return `${route.filePath}|${route.line}|${route.method}|${route.path}`;
}
