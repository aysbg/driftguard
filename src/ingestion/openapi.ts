import { parse } from 'yaml';

import type { DataModel, OpenApiOperation } from '../types/spec.js';

const httpMethods = ['delete', 'get', 'patch', 'post', 'put'] as const;

type HttpMethod = (typeof httpMethods)[number];

interface ParsedOperation {
  operationId?: string;
  summary?: string;
  parameters?: ParsedParameter[];
  responses?: Record<string, ParsedResponse>;
}

interface ParsedParameter {
  name?: string;
  in?: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
}

interface ParsedResponse {
  description?: string;
}

interface ParsedDocument {
  paths?: Record<string, Partial<Record<HttpMethod, ParsedOperation>>>;
  components?: {
    schemas?: Record<string, unknown>;
  };
}

export function extractOpenApiOperations(filePath: string, content: string): OpenApiOperation[] {
  const document = parse(content) as ParsedDocument;
  const paths = document.paths ?? {};

  return Object.keys(paths)
    .sort((left, right) => left.localeCompare(right))
    .flatMap((path) => {
      const pathItem = paths[path] ?? {};

      return httpMethods
        .filter((method) => pathItem[method] !== undefined)
        .map((method) => {
          const operation = pathItem[method];
          const parameters = (operation?.parameters ?? [])
            .filter((parameter): parameter is Required<Pick<ParsedParameter, 'name' | 'in'>> & ParsedParameter => {
              return typeof parameter?.name === 'string' && parameter.in !== undefined;
            })
            .map((parameter) => ({
              name: parameter.name,
              in: parameter.in,
              ...(parameter.required !== undefined ? { required: parameter.required } : {}),
              ...(parameter.description !== undefined ? { description: parameter.description } : {}),
            }))
            .sort((left, right) => {
              const byIn = left.in.localeCompare(right.in);

              if (byIn !== 0) {
                return byIn;
              }

              return left.name.localeCompare(right.name);
            });

          const responses = Object.entries(operation?.responses ?? {})
            .map(([statusCode, response]) => ({
              statusCode,
              ...(response?.description !== undefined ? { description: response.description } : {}),
            }))
            .sort((left, right) => left.statusCode.localeCompare(right.statusCode, undefined, { numeric: true }));

          return {
            filePath,
            method: method.toUpperCase(),
            path,
            operationId: operation?.operationId,
            summary: operation?.summary,
            parameters,
            responses,
          } satisfies OpenApiOperation;
        });
    });
}

export function extractDataModels(filePath: string, content: string): DataModel[] {
  const document = parse(content) as ParsedDocument;
  const schemas = document.components?.schemas ?? {};

  return Object.keys(schemas)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      filePath,
      properties: [],
      source: 'openapi' as const,
    }));
}
