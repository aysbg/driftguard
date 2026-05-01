import { describe, it, expect } from 'vitest';
import { computeBlastRadius } from '../../../src/finding/blast-radius.js';
import type { DriftFinding } from '../../../src/types/finding.js';

function makeFinding(partial: Partial<DriftFinding>): DriftFinding {
  return {
    id: 'test-finding',
    summary: 'test',
    severity: 'medium',
    confidence: 'high',
    mappingConfidence: 'medium',
    affectedFiles: [],
    specReferences: [],
    ...partial,
  } as DriftFinding;
}

describe('computeBlastRadius', () => {
  it('0 affected files → unknown', () => {
    const finding = makeFinding({ affectedFiles: [] });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('unknown');
    expect(result.impactedArtifacts).toEqual([]);
  });

  it('1 affected file → limited', () => {
    const finding = makeFinding({ affectedFiles: ['src/app.ts'] });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('limited');
    expect(result.impactedArtifacts).toEqual([{ type: 'file', name: 'src/app.ts' }]);
  });

  it('5 affected files → broad', () => {
    const finding = makeFinding({
      affectedFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'],
    });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('broad');
    expect(result.impactedArtifacts.slice(0, 5)).toEqual([
      { type: 'file', name: 'a.ts' },
      { type: 'file', name: 'b.ts' },
      { type: 'file', name: 'c.ts' },
      { type: 'file', name: 'd.ts' },
      { type: 'file', name: 'e.ts' },
    ]);
  });

  it('endpoint finding adds endpoint artifact', () => {
    const finding = makeFinding({
      affectedFiles: ['src/routes/users.ts'],
      method: 'GET',
      path: '/users/{id}',
    });
    const result = computeBlastRadius(finding);
    expect(result.impactedArtifacts).toContainEqual({
      type: 'endpoint',
      name: 'GET /users/{id}',
    });
    expect(result.impactedArtifacts).toContainEqual({
      type: 'file',
      name: 'src/routes/users.ts',
    });
  });

  it('ADR finding with no mapping → unknown', () => {
    const finding = makeFinding({
      method: undefined,
      path: undefined,
      codeEvidence: undefined,
      affectedFiles: [],
    });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('unknown');
    expect(result.impactedArtifacts).toEqual([]);
  });

  it('2 affected files → moderate', () => {
    const finding = makeFinding({ affectedFiles: ['a.ts', 'b.ts'] });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('moderate');
  });

  it('3 affected files → moderate', () => {
    const finding = makeFinding({ affectedFiles: ['a.ts', 'b.ts', 'c.ts'] });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('moderate');
  });

  it('4 affected files → broad', () => {
    const finding = makeFinding({ affectedFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts'] });
    const result = computeBlastRadius(finding);
    expect(result.level).toBe('broad');
  });
});
