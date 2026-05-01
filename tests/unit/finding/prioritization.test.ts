import { describe, expect, it } from 'vitest';
import { assignSeverity, sortBySeverity } from '../../../src/finding/prioritization.js';
import type { DriftFinding } from '../../../src/types/finding.js';

function baseFinding(overrides: Partial<DriftFinding> = {}): DriftFinding {
  return {
    id: 'test:finding',
    summary: 'Test finding',
    severity: 'medium',
    confidence: 'medium',
    mappingConfidence: 'medium',
    affectedFiles: [],
    specReferences: [],
    ...overrides,
  };
}

describe('assignSeverity', () => {
  it('missing route gets correct factors', () => {
    const finding = baseFinding({
      id: 'openapi-route-exists:GET|/users|specs/openapi.yml',
      confidence: 'high',
      affectedFiles: [],
    });
    const result = assignSeverity(finding, {});
    expect(result.severityRationale?.factors).toContain('Missing API route — breaks contract');
    expect(result.severityRationale?.factors).toContain('High confidence mapping');
  });

  it('high confidence gets high confidence factor', () => {
    const finding = baseFinding({
      id: 'other-rule',
      confidence: 'high',
      affectedFiles: [],
    });
    const result = assignSeverity(finding, {});
    expect(result.severityRationale?.factors).toEqual(['High confidence mapping']);
    expect(result.severityRationale?.score).toBe(1);
  });

  it('low confidence gets low confidence factor', () => {
    const finding = baseFinding({
      id: 'other-rule',
      confidence: 'low',
      affectedFiles: [],
    });
    const result = assignSeverity(finding, {});
    expect(result.severityRationale?.factors).toEqual(['Low confidence mapping reduces severity']);
    expect(result.severityRationale?.score).toBe(1);
  });

  it('broad blast radius gets broad factor', () => {
    const finding = baseFinding({
      id: 'other-rule',
      affectedFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
    });
    const result = assignSeverity(finding, {});
    expect(result.severityRationale?.factors).toContain('Broad blast radius');
    expect(result.severityRationale?.score).toBe(1);
  });

  it('limited blast radius gets limited factor', () => {
    const finding = baseFinding({
      id: 'other-rule',
      affectedFiles: ['a.ts'],
    });
    const result = assignSeverity(finding, {});
    expect(result.severityRationale?.factors).toEqual(['Limited blast radius']);
    expect(result.severityRationale?.score).toBe(1);
  });

  it('returns a copy with new fields added', () => {
    const finding = baseFinding({ id: 'other-rule', affectedFiles: ['a.ts'] });
    const result = assignSeverity(finding, {});
    expect(result).not.toBe(finding);
    expect(result.severityRationale).toBeDefined();
    expect(finding.severityRationale).toBeUndefined();
  });
});

describe('sortBySeverity', () => {
  it('sorts by severity high > medium > low, then by id', () => {
    const low1 = baseFinding({ id: 'low-1', severity: 'low' });
    const medium1 = baseFinding({ id: 'medium-1', severity: 'medium' });
    const high1 = baseFinding({ id: 'high-1', severity: 'high' });
    const low2 = baseFinding({ id: 'low-2', severity: 'low' });
    const medium2 = baseFinding({ id: 'medium-2', severity: 'medium' });

    const sorted = sortBySeverity([low1, medium1, high1, low2, medium2]);
    expect(sorted.map((f) => f.id)).toEqual(['high-1', 'medium-1', 'medium-2', 'low-1', 'low-2']);
  });
});
