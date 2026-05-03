import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractDataModels, extractOpenApiOperations } from '../../../src/ingestion/openapi.js';

describe('extractOpenApiOperations', () => {
  it('extracts GET users operation', () => {
    const filePath = 'specs/openapi.yml';
    const content = readFileSync(resolve('tests/fixtures/no-drift/specs/openapi.yml'), 'utf8');

    const operations = extractOpenApiOperations(filePath, content);

    expect(operations).toEqual([
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
    ]);
  });

  it('extracts rich parameters and responses', () => {
    const filePath = 'specs/api.yml';
    const content = readFileSync(resolve('tests/fixtures/rich-openapi/specs/api.yml'), 'utf8');

    const operations = extractOpenApiOperations(filePath, content);

    expect(operations).toEqual([
      {
        filePath: 'specs/api.yml',
        method: 'GET',
        path: '/users/{id}',
        operationId: 'getUserById',
        summary: 'Get user by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'The unique identifier of the user',
          },
          {
            name: 'fields',
            in: 'query',
            required: false,
            description: 'Comma-separated list of fields to include in response',
          },
        ],
        responses: [
          {
            statusCode: '200',
            description: 'User found and returned successfully',
          },
          {
            statusCode: '404',
            description: 'User not found - the specified ID does not correspond to an existing user',
          },
        ],
      },
    ]);
  });

  it('returns empty arrays when parameters and responses are missing', () => {
    const filePath = 'specs/minimal.yml';
    const content = `openapi: 3.0.3
paths:
  /health:
    get:
      operationId: health
      summary: Health check
`;

    const operations = extractOpenApiOperations(filePath, content);

    expect(operations).toEqual([
      {
        filePath: 'specs/minimal.yml',
        method: 'GET',
        path: '/health',
        operationId: 'health',
        summary: 'Health check',
        parameters: [],
        responses: [],
      },
    ]);
  });

  it('sorts extracted parameters and responses deterministically', () => {
    const filePath = 'specs/ordering.yml';
    const content = `openapi: 3.0.3
paths:
  /users:
    get:
      parameters:
        - name: zeta
          in: query
          required: false
        - name: alpha
          in: query
          required: true
      responses:
        '404':
          description: Missing
        '200':
          description: OK
`;

    const operations = extractOpenApiOperations(filePath, content);

    expect(operations[0]?.parameters).toEqual([
      {
        name: 'alpha',
        in: 'query',
        required: true,
      },
      {
        name: 'zeta',
        in: 'query',
        required: false,
      },
    ]);

    expect(operations[0]?.responses).toEqual([
      {
        statusCode: '200',
        description: 'OK',
      },
      {
        statusCode: '404',
        description: 'Missing',
      },
    ]);
  });
});

describe('extractDataModels', () => {
  it('extracts data models from components.schemas', () => {
    const filePath = 'specs/openapi.yml';
    const content = `openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
    Order:
      type: object
      properties:
        id:
          type: string
`;

    const models = extractDataModels(filePath, content);

    expect(models).toEqual([
      {
        name: 'Order',
        filePath: 'specs/openapi.yml',
        properties: [],
        source: 'openapi',
      },
      {
        name: 'User',
        filePath: 'specs/openapi.yml',
        properties: [],
        source: 'openapi',
      },
    ]);
  });

  it('returns empty array when no schemas defined', () => {
    const filePath = 'specs/empty.yml';
    const content = `openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
`;

    const models = extractDataModels(filePath, content);

    expect(models).toEqual([]);
  });

  it('returns empty array for malformed documents', () => {
    const filePath = 'specs/bad.yml';
    const content = 'this is not yaml at all';

    const models = extractDataModels(filePath, content);

    expect(models).toEqual([]);
  });

  it('sorts data models deterministically by name', () => {
    const filePath = 'specs/ordering.yml';
    const content = `openapi: 3.0.3
info:
  title: Test API
  version: 1.0.0
components:
  schemas:
    Zebra:
      type: object
    Alpha:
      type: object
    Middle:
      type: object
`;

    const models = extractDataModels(filePath, content);

    expect(models.map((m) => m.name)).toEqual(['Alpha', 'Middle', 'Zebra']);
  });
});
