import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

async function loadSchemas() {
  return await import(resolve('dist/types/report.js'));
}

describe('reportOutputSchema', () => {
  it('passes valid report with ok status', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const valid = {
      status: 'ok',
      totalFindings: 0,
      findings: [],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid report with drift_found status', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const valid = {
      status: 'drift_found',
      totalFindings: 1,
      findings: [
        {
          id: 'get|/users/{id}|specs/openapi.yml',
          summary: 'OpenAPI operation is not implemented by an indexed route',
          severity: 'high',
          confidence: 'high',
          mappingConfidence: 'low',
          method: 'GET',
          path: '/users/{id}',
          affectedFiles: ['src/routes/users.ts'],
          specReferences: ['specs/openapi.yml'],
        },
      ],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('passes valid report with error status', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const valid = {
      status: 'error',
      totalFindings: 0,
      findings: [],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('fails if finding is missing summary', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const invalid = {
      status: 'drift_found',
      totalFindings: 1,
      findings: [
        {
          id: 'get|/users/{id}|specs/openapi.yml',
          severity: 'high',
          confidence: 'high',
          mappingConfidence: 'low',
          method: 'GET',
          path: '/users/{id}',
          affectedFiles: ['src/routes/users.ts'],
          specReferences: ['specs/openapi.yml'],
        },
      ],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails if status is invalid', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const invalid = {
      status: 'invalid_status',
      totalFindings: 0,
      findings: [],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails if totalFindings is missing', async () => {
    const { reportOutputSchema } = await loadSchemas();
    const invalid = {
      status: 'ok',
      findings: [],
      warnings: [],
    };
    const result = reportOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});