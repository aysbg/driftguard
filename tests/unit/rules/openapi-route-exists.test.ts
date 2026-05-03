import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ingestSpecs } from '../../../src/ingestion/spec-ingestor.js';
import { mapOpenApiOperationsToRoutes } from '../../../src/mapping/mapper.js';
import { indexRepository } from '../../../src/repository/indexer.js';
import { runRuleEngine } from '../../../src/rules/engine.js';
import { evaluateOpenApiRouteExists } from '../../../src/rules/openapi-route-exists.js';
import type { Mapping } from '../../../src/types/finding.js';
import type { RepositoryIndex } from '../../../src/types/repository.js';

describe('mapOpenApiOperationsToRoutes', () => {
  it('matches exact method and normalized path', async () => {
    const repo = resolve('tests/fixtures/no-drift');
    const spec = await ingestSpecs({
      repo,
      spec: ['specs/openapi.yml'],
    });
    const repository = await indexRepository({
      repo,
      code: [resolve(repo, 'src')],
    });

    expect(mapOpenApiOperationsToRoutes(spec, repository.index)).toEqual({
      mappings: [
        {
          specOperation: {
            filePath: 'specs/openapi.yml',
            method: 'GET',
            path: '/users/{id}',
          },
          codeRoute: {
            filePath: 'src/routes/users.ts',
            method: 'GET',
            path: '/users/{id}',
          },
          confidence: 'medium',
          specCitation: {
            filePath: 'specs/openapi.yml',
            sectionOrOperation: 'GET /users/{id}',
          },
          codeEvidence: {
            filePath: 'src/routes/users.ts',
            startLine: 5,
            snippet: "router.get('/users/:id', (req, res) => {\n  const { id } = req.params;\n  res.json({ id, name: 'Test User' });\n})",
          },
        },
      ],
      unmatchedRoutes: [],
    });
  });
});

describe('evaluateOpenApiRouteExists', () => {
  it('no finding when route exists', async () => {
    const repo = resolve('tests/fixtures/no-drift');
    const spec = await ingestSpecs({
      repo,
      spec: ['specs/openapi.yml'],
    });
    const repository = await indexRepository({
      repo,
      code: [resolve(repo, 'src')],
    });
    const mappings = mapOpenApiOperationsToRoutes(spec, repository.index);

    expect(evaluateOpenApiRouteExists(mappings.mappings, repository.index)).toEqual([]);
  });

  it('missing route emits finding', async () => {
    const repo = resolve('tests/fixtures/missing-route');
    const spec = await ingestSpecs({
      repo,
      spec: ['specs/openapi.yml'],
    });
    const repository = await indexRepository({
      repo,
      code: [resolve(repo, 'src')],
    });
    const mappingResult = mapOpenApiOperationsToRoutes(spec, repository.index);

    expect(runRuleEngine({ spec, repository, mappingResult })).toEqual({
      mappings: [
        {
          specOperation: {
            filePath: 'specs/openapi.yml',
            method: 'GET',
            path: '/users/{id}',
          },
          codeRoute: null,
          confidence: 'medium',
          specCitation: {
            filePath: 'specs/openapi.yml',
            sectionOrOperation: 'GET /users/{id}',
          },
          codeEvidence: {
            filePath: 'src/routes/users.ts',
          },
        },
      ],
      sectionMappings: undefined,
      findings: [
        {
          id: 'extra-route-not-in-spec:GET|/health|src/routes/users.ts',
          summary: 'Route implementation exists with no matching spec operation',
          severity: 'medium',
          confidence: 'high',
          mappingConfidence: 'medium',
          method: 'GET',
          path: '/health',
          affectedFiles: ['src/routes/users.ts'],
          specReferences: [],
          explanation: {
            expected: 'matching spec operation',
            found: 'no spec operation for this route',
            reason: 'extra route in code not documented in spec',
          },
        },
        {
          id: 'openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
          summary: 'OpenAPI operation is not implemented by an indexed route',
          severity: 'high',
          confidence: 'high',
          mappingConfidence: 'medium',
          method: 'GET',
          path: '/users/{id}',
          affectedFiles: ['src/routes/users.ts'],
          specReferences: ['specs/openapi.yml'],
          specCitations: [
            {
              filePath: 'specs/openapi.yml',
              sectionOrOperation: 'GET /users/{id}',
            },
          ],
          codeEvidence: [
            {
              filePath: 'src/routes/users.ts',
            },
          ],
          explanation: {
            expected: 'OpenAPI defines GET /users/{id} with parameters [path: id]',
            found: 'No matching route implementation found in code',
            reason: 'The documented API operation has no corresponding route handler',
          },
        },
      ],
      warnings: [],
    });
  });

  it('uses lexicographic tie-break when affected-file scores are equal', () => {
    const mappings: Mapping[] = [
      {
        specOperation: {
          filePath: 'specs/openapi.yml',
          method: 'GET',
          path: '/orders/{id}',
        },
        codeRoute: null,
        confidence: 'low',
      },
    ];
    const repositoryIndex: RepositoryIndex = {
      files: [
        {
          filePath: 'src/routes/zeta.ts',
          routes: [],
        },
        {
          filePath: 'src/routes/alpha.ts',
          routes: [],
        },
      ],
    };

    expect(evaluateOpenApiRouteExists(mappings, repositoryIndex)).toEqual([
      {
        id: 'openapi-route-exists:GET|/orders/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'low',
        method: 'GET',
        path: '/orders/{id}',
        affectedFiles: ['src/routes/alpha.ts'],
        specReferences: ['specs/openapi.yml'],
        explanation: {
          expected: 'OpenAPI defines GET /orders/{id} with parameters [path: id]',
          found: 'No matching route implementation found in code',
          reason: 'The documented API operation has no corresponding route handler',
        },
      },
    ]);
  });

  it('includes citation and evidence arrays when mapping provides them', () => {
    const mappings: Mapping[] = [
      {
        specOperation: {
          filePath: 'specs/openapi.yml',
          method: 'GET',
          path: '/users/{id}',
        },
        codeRoute: null,
        confidence: 'medium',
        specCitation: {
          filePath: 'specs/openapi.yml',
          sectionOrOperation: 'GET /users/{id}',
        },
        codeEvidence: {
          filePath: 'src/routes/users.ts',
          startLine: 12,
          snippet: "router.get('/users/:id', handler)",
        },
      },
    ];

    const repositoryIndex: RepositoryIndex = {
      files: [
        {
          filePath: 'src/routes/users.ts',
          routes: [],
        },
      ],
    };

    expect(evaluateOpenApiRouteExists(mappings, repositoryIndex)).toEqual([
      {
        id: 'openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        method: 'GET',
        path: '/users/{id}',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
        specCitations: [
          {
            filePath: 'specs/openapi.yml',
            sectionOrOperation: 'GET /users/{id}',
          },
        ],
        codeEvidence: [
          {
            filePath: 'src/routes/users.ts',
            startLine: 12,
            snippet: "router.get('/users/:id', handler)",
          },
        ],
        explanation: {
          expected: 'OpenAPI defines GET /users/{id} with parameters [path: id]',
          found: 'No matching route implementation found in code',
          reason: 'The documented API operation has no corresponding route handler',
        },
      },
    ]);
  });
});
