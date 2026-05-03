import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ingestSpecs } from '../../../src/ingestion/spec-ingestor.js';

describe('ingestSpecs', () => {
  it('ingests configured spec files', async () => {
    const result = await ingestSpecs({
      repo: resolve('tests/fixtures/no-drift'),
      spec: ['docs/requirements.md', 'specs/openapi.yml'],
    });

    expect(result.parseWarnings).toEqual([]);
    expect(result.documents).toEqual([
      {
        filePath: 'docs/requirements.md',
        sections: [
          {
            filePath: 'docs/requirements.md',
            heading: 'User Management',
            slug: 'user-management',
            startLine: 1,
            endLine: 2,
            text: '',
          },
          {
            filePath: 'docs/requirements.md',
            heading: 'User Lookup',
            slug: 'user-lookup',
            startLine: 3,
            endLine: 6,
            text: 'The system must support retrieving individual users by their unique identifier.',
          },
          {
            filePath: 'docs/requirements.md',
            heading: 'Requirements',
            slug: 'requirements',
            startLine: 7,
            endLine: 12,
            text: '- Users can be looked up by ID\n- Lookup returns user details including name and contact information\n- Lookup operations complete within acceptable latency thresholds',
          },
        ],
        operations: [],
        dataModels: [],
        businessRules: [],
        stories: [],
      },
      {
        filePath: 'specs/openapi.yml',
        sections: [],
        operations: [
          {
            filePath: 'specs/openapi.yml',
            method: 'GET',
            path: '/users/{id}',
            operationId: 'getUserById',
            summary: 'Get user by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
              },
            ],
            responses: [
              {
                statusCode: '200',
                description: 'User found',
              },
              {
                statusCode: '404',
                description: 'User not found',
              },
            ],
          },
        ],
        dataModels: [],
        businessRules: [],
        stories: [],
      },
    ]);
  });

  it('supports absolute spec file paths while emitting repo-relative paths', async () => {
    const repo = resolve('tests/fixtures/no-drift');
    const result = await ingestSpecs({
      repo,
      spec: [resolve(repo, 'specs/openapi.yml')],
    });

    expect(result.parseWarnings).toEqual([]);
    expect(result.documents).toEqual([
      {
        filePath: 'specs/openapi.yml',
        sections: [],
        operations: [
          {
            filePath: 'specs/openapi.yml',
            method: 'GET',
            path: '/users/{id}',
            operationId: 'getUserById',
            summary: 'Get user by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
              },
            ],
            responses: [
              {
                statusCode: '200',
                description: 'User found',
              },
              {
                statusCode: '404',
                description: 'User not found',
              },
            ],
          },
        ],
        dataModels: [],
        businessRules: [],
        stories: [],
      },
    ]);
  });

  it('parse warning fail-open', async () => {
    const result = await ingestSpecs({
      repo: resolve('tests/fixtures/parse-warning'),
      spec: ['specs'],
    });

    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.filePath).toBe('specs/invalid.yml');
    expect(result.documents).toEqual([
      {
        filePath: 'specs/valid.yml',
        sections: [],
        operations: [
          {
            filePath: 'specs/valid.yml',
            method: 'GET',
            path: '/products',
            operationId: 'listProducts',
            summary: 'List products',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Product list',
              },
            ],
          },
        ],
        dataModels: [],
        businessRules: [],
        stories: [],
      },
    ]);
  });

  it('supports absolute spec directory paths while emitting repo-relative paths', async () => {
    const repo = resolve('tests/fixtures/parse-warning');
    const result = await ingestSpecs({
      repo,
      spec: [resolve(repo, 'specs')],
    });

    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.filePath).toBe('specs/invalid.yml');
    expect(result.documents).toEqual([
      {
        filePath: 'specs/valid.yml',
        sections: [],
        operations: [
          {
            filePath: 'specs/valid.yml',
            method: 'GET',
            path: '/products',
            operationId: 'listProducts',
            summary: 'List products',
            parameters: [],
            responses: [
              {
                statusCode: '200',
                description: 'Product list',
              },
            ],
          },
        ],
        dataModels: [],
        businessRules: [],
        stories: [],
      },
    ]);
  });

  it('returns deterministic operation ordering across repeated runs', async () => {
    const input = {
      repo: resolve('tests/fixtures/config-override'),
      spec: ['specs'],
    };

    const first = await ingestSpecs(input);
    const second = await ingestSpecs(input);

    expect(first).toEqual(second);
    expect(first.documents.map((document) => document.filePath)).toEqual([
      'specs/config-openapi.yml',
      'specs/override-openapi.yml',
    ]);
    expect(first.documents.flatMap((document) => document.operations)).toEqual([
      {
        filePath: 'specs/config-openapi.yml',
        method: 'GET',
        path: '/accounts',
        operationId: 'listAccounts',
        summary: 'List accounts from config spec',
        parameters: [],
        responses: [
          {
            statusCode: '200',
            description: 'Account list',
          },
        ],
      },
      {
        filePath: 'specs/override-openapi.yml',
        method: 'GET',
        path: '/users',
        operationId: 'listUsers',
        summary: 'List users from override spec',
        parameters: [],
        responses: [
          {
            statusCode: '200',
            description: 'User list',
          },
        ],
      },
    ]);
  });
});
