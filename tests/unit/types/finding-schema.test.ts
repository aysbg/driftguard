import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

async function loadSchemas() {
  return await import(resolve('dist/types/finding.js'));
}

describe('specCitationSchema', () => {
  it('passes valid spec citation with all fields', async () => {
    const { specCitationSchema } = await loadSchemas();
    const valid = {
      filePath: 'specs/openapi.yml',
      sectionOrOperation: 'paths./users/{id}.get',
      startLine: 10,
      endLine: 25,
    };
    const result = specCitationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid spec citation with minimal fields', async () => {
    const { specCitationSchema } = await loadSchemas();
    const valid = {
      filePath: 'specs/openapi.yml',
      sectionOrOperation: 'paths./users.get',
    };
    const result = specCitationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails if filePath is missing', async () => {
    const { specCitationSchema } = await loadSchemas();
    const invalid = {
      sectionOrOperation: 'paths./users.get',
    };
    const result = specCitationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('codeEvidenceSchema', () => {
  it('passes valid code evidence with all fields', async () => {
    const { codeEvidenceSchema } = await loadSchemas();
    const valid = {
      filePath: 'src/routes/users.ts',
      startLine: 5,
      endLine: 10,
      snippet: 'router.get("/users/:id", handler)',
    };
    const result = codeEvidenceSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid code evidence with minimal fields', async () => {
    const { codeEvidenceSchema } = await loadSchemas();
    const valid = {
      filePath: 'src/routes/users.ts',
    };
    const result = codeEvidenceSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails if filePath is missing', async () => {
    const { codeEvidenceSchema } = await loadSchemas();
    const invalid = {
      startLine: 5,
      endLine: 10,
    };
    const result = codeEvidenceSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('explanationSchema', () => {
  it('passes valid explanation with all fields', async () => {
    const { explanationSchema } = await loadSchemas();
    const valid = {
      expected: 'Operation should have 200 response defined',
      found: 'No response schema for 200',
      reason: 'API spec requires documented responses',
    };
    const result = explanationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid explanation with minimal fields', async () => {
    const { explanationSchema } = await loadSchemas();
    const valid = {
      expected: 'Response status 200',
    };
    const result = explanationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes explanation with no fields (all optional)', async () => {
    const { explanationSchema } = await loadSchemas();
    const valid = {};
    const result = explanationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('driftFindingSchema', () => {
  it('passes finding with specCitations', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
      specCitations: [{
        filePath: 'specs/openapi.yml',
        sectionOrOperation: 'paths./users/{id}',
      }],
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes finding with codeEvidence', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
      codeEvidence: [{
        filePath: 'src/routes/users.ts',
        startLine: 5,
        endLine: 10,
        snippet: 'router.get("/users/:id", handler)',
      }],
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes finding with explanation', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
      explanation: {
        expected: 'Response status 200',
        found: 'No response defined',
        reason: 'Spec requires documented responses',
      },
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes finding with Epic 4 optional fields', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
      severityRationale: { factors: ['Missing API contract'] },
      blastRadius: {
        level: 'moderate',
        impactedArtifacts: [
          { type: 'endpoint', name: 'GET /users/{id}' },
          { type: 'file', name: 'src/routes/users.ts' },
        ],
      },
      remediationHint: 'Add route handler for GET /users/{id}',
      baselineStatus: 'new',
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes finding without Epic 4 fields (backward compatible)', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes finding with all optional fields combined', async () => {
    const { driftFindingSchema } = await loadSchemas();
    const valid = {
      id: 'get|/users/{id}|specs/openapi.yml',
      summary: 'OpenAPI operation is not implemented',
      severity: 'high',
      confidence: 'high',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users/{id}',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
      specCitations: [{
        filePath: 'specs/openapi.yml',
        sectionOrOperation: 'paths./users/{id}',
        startLine: 10,
        endLine: 25,
      }],
      codeEvidence: [{
        filePath: 'src/routes/users.ts',
        startLine: 5,
        endLine: 10,
        snippet: 'router.get("/users/:id", handler)',
      }],
      explanation: {
        expected: 'Response status 200',
        found: 'No response defined',
        reason: 'Spec requires documented responses',
      },
      severityRationale: { factors: ['Missing API contract', 'High confidence mapping'] },
      blastRadius: {
        level: 'broad',
        impactedArtifacts: [
          { type: 'endpoint', name: 'GET /users/{id}' },
          { type: 'file', name: 'src/routes/users.ts' },
          { type: 'service', name: 'user-service' },
        ],
      },
      remediationHint: 'Implement route handler',
      baselineStatus: 'new',
    };
    const result = driftFindingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
