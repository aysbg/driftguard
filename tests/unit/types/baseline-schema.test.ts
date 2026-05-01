import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

async function loadSchemas() {
  return await import(resolve('dist/types/baseline.js'));
}

describe('baselineFindingSchema', () => {
  it('passes valid baseline finding with minimal fields', async () => {
    const { baselineFindingSchema } = await loadSchemas();
    const result = baselineFindingSchema.safeParse({
      id: 'f-1',
      severity: 'high',
      summary: 'Missing route',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
    });
    expect(result.success).toBe(true);
  });

  it('passes valid baseline finding with optional blastRadius', async () => {
    const { baselineFindingSchema } = await loadSchemas();
    const result = baselineFindingSchema.safeParse({
      id: 'f-1',
      severity: 'high',
      blastRadius: {
        level: 'moderate',
        impactedArtifacts: [{ type: 'file', name: 'src/routes/users.ts' }],
      },
      summary: 'Missing route',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
    });
    expect(result.success).toBe(true);
  });

  it('fails if id is missing', async () => {
    const { baselineFindingSchema } = await loadSchemas();
    const result = baselineFindingSchema.safeParse({
      severity: 'high',
      summary: 'Missing route',
      affectedFiles: ['src/routes/users.ts'],
      specReferences: ['specs/openapi.yml'],
    });
    expect(result.success).toBe(false);
  });
});

describe('baselineFileSchema', () => {
  it('passes valid baseline file with all fields', async () => {
    const { baselineFileSchema } = await loadSchemas();
    const result = baselineFileSchema.safeParse({
      formatVersion: 1,
      name: 'default',
      createdAt: '2024-01-01T00:00:00Z',
      repoPath: '/tmp/repo',
      commitSha: 'abc123',
      findings: [
        {
          id: 'f-1',
          severity: 'high',
          summary: 'Missing route',
          affectedFiles: ['src/routes/users.ts'],
          specReferences: ['specs/openapi.yml'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('passes without optional commitSha', async () => {
    const { baselineFileSchema } = await loadSchemas();
    const result = baselineFileSchema.safeParse({
      formatVersion: 1,
      name: 'default',
      createdAt: '2024-01-01T00:00:00Z',
      repoPath: '/tmp/repo',
      findings: [],
    });
    expect(result.success).toBe(true);
  });

  it('fails if formatVersion is missing', async () => {
    const { baselineFileSchema } = await loadSchemas();
    const result = baselineFileSchema.safeParse({
      name: 'default',
      createdAt: '2024-01-01T00:00:00Z',
      repoPath: '/tmp/repo',
      findings: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('baselineComparisonResultSchema', () => {
  it('passes new finding result', async () => {
    const { baselineComparisonResultSchema } = await loadSchemas();
    const result = baselineComparisonResultSchema.safeParse({
      status: 'new',
      finding: {
        id: 'f-1',
        severity: 'high',
        summary: 'Missing route',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('passes persisted result with previousFinding', async () => {
    const { baselineComparisonResultSchema } = await loadSchemas();
    const result = baselineComparisonResultSchema.safeParse({
      status: 'persisted',
      finding: {
        id: 'f-1',
        severity: 'high',
        summary: 'Missing route',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
      previousFinding: {
        id: 'f-1',
        severity: 'high',
        summary: 'Missing route',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('fails if status is invalid', async () => {
    const { baselineComparisonResultSchema } = await loadSchemas();
    const result = baselineComparisonResultSchema.safeParse({
      status: 'unknown',
      finding: {
        id: 'f-1',
        severity: 'high',
        summary: 'Missing route',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    });
    expect(result.success).toBe(false);
  });
});
