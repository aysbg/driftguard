import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ingestSpecs } from '../../../src/ingestion/spec-ingestor.js';
import { mapOpenApiOperationsToRoutes } from '../../../src/mapping/mapper.js';
import { indexRepository } from '../../../src/repository/indexer.js';

describe('mapOpenApiOperationsToRoutes enrichment', () => {
  it('adds specCitation and codeEvidence for matched operations', async () => {
    const repo = resolve('tests/fixtures/no-drift');
    const spec = await ingestSpecs({
      repo,
      spec: ['specs/openapi.yml'],
    });
    const repository = await indexRepository({
      repo,
      code: [resolve(repo, 'src')],
    });

    const result = mapOpenApiOperationsToRoutes(spec, repository.index);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]).toMatchObject({
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
      specCitation: {
        filePath: 'specs/openapi.yml',
        sectionOrOperation: 'GET /users/{id}',
      },
      codeEvidence: {
        filePath: 'src/routes/users.ts',
        startLine: 5,
        snippet: expect.stringContaining("router.get('/users/:id', (req, res) => {"),
      },
      confidence: 'medium',
    });
  });

  it('adds specCitation and derived codeEvidence for unmatched operations', async () => {
    const repo = resolve('tests/fixtures/missing-route');
    const spec = await ingestSpecs({
      repo,
      spec: ['specs/openapi.yml'],
    });
    const repository = await indexRepository({
      repo,
      code: [resolve(repo, 'src')],
    });

    const result = mapOpenApiOperationsToRoutes(spec, repository.index);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]).toMatchObject({
      specOperation: {
        filePath: 'specs/openapi.yml',
        method: 'GET',
        path: '/users/{id}',
      },
      codeRoute: null,
      specCitation: {
        filePath: 'specs/openapi.yml',
        sectionOrOperation: 'GET /users/{id}',
      },
      codeEvidence: {
        filePath: 'src/routes/users.ts',
      },
      confidence: 'medium',
    });
    expect(result.mappings[0].codeEvidence).not.toHaveProperty('startLine');
    expect(result.mappings[0].codeEvidence).not.toHaveProperty('snippet');
  });
});
