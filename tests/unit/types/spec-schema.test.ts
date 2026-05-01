import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

async function loadSchemas() {
  return await import(resolve('dist/types/spec.js'));
}

describe('OpenApiParameter', () => {
  it('passes valid parameter with all fields', async () => {
    const { openApiParameterSchema } = await loadSchemas();
    const valid = {
      name: 'userId',
      in: 'path',
      required: true,
      description: 'The ID of the user',
    };
    const result = openApiParameterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid parameter with optional fields omitted', async () => {
    const { openApiParameterSchema } = await loadSchemas();
    const valid = {
      name: 'userId',
      in: 'path',
    };
    const result = openApiParameterSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails if name is missing', async () => {
    const { openApiParameterSchema } = await loadSchemas();
    const invalid = {
      in: 'path',
      required: true,
    };
    const result = openApiParameterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails if in is invalid', async () => {
    const { openApiParameterSchema } = await loadSchemas();
    const invalid = {
      name: 'userId',
      in: 'invalid',
      required: true,
    };
    const result = openApiParameterSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('OpenApiResponse', () => {
  it('passes valid response with all fields', async () => {
    const { openApiResponseSchema } = await loadSchemas();
    const valid = {
      statusCode: '200',
      description: 'Successful response',
    };
    const result = openApiResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid response with only statusCode', async () => {
    const { openApiResponseSchema } = await loadSchemas();
    const valid = {
      statusCode: '404',
    };
    const result = openApiResponseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails if statusCode is missing', async () => {
    const { openApiResponseSchema } = await loadSchemas();
    const invalid = {
      description: 'Some response',
    };
    const result = openApiResponseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('AdrDocument', () => {
  it('passes valid ADR document with frontmatter', async () => {
    const { adrDocumentSchema } = await loadSchemas();
    const valid = {
      filePath: 'docs/adr/001-use-openapi.md',
      sections: [],
      operations: [],
      frontmatter: {
        status: 'accepted',
        date: '2024-01-15',
        decision: 'ADR-001',
        supersededBy: 'ADR-002',
      },
    };
    const result = adrDocumentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid ADR document without frontmatter', async () => {
    const { adrDocumentSchema } = await loadSchemas();
    const valid = {
      filePath: 'docs/adr/001-use-openapi.md',
      sections: [],
      operations: [],
    };
    const result = adrDocumentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid ADR document with partial frontmatter', async () => {
    const { adrDocumentSchema } = await loadSchemas();
    const valid = {
      filePath: 'docs/adr/001-use-openapi.md',
      sections: [],
      operations: [],
      frontmatter: {
        status: 'accepted',
      },
    };
    const result = adrDocumentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});