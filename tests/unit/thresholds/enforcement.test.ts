import { describe, expect, it } from 'vitest';
import { evaluateEnforcement } from '../../../src/thresholds/enforcement.js';
import type { DriftFinding } from '../../../src/types/finding.js';

function makeFinding(severity: 'high' | 'medium' | 'low', baselineStatus?: DriftFinding['baselineStatus']): DriftFinding {
  return {
    id: `f-${severity}`,
    summary: `A ${severity} finding`,
    severity,
    confidence: 'high',
    mappingConfidence: 'high',
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
    baselineStatus,
  };
}

describe('evaluateEnforcement', () => {
  it('fails on high severity when high is present', () => {
    const findings = [makeFinding('high')];
    const result = evaluateEnforcement(findings, { failOn: ['high'] });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('does not fail on high-only when only medium finding present', () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, { failOn: ['high'] });
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('fails on medium when medium finding present', () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, { failOn: ['medium'] });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('cascades — fail-on medium also catches high finding', () => {
    const findings = [makeFinding('high')];
    const result = evaluateEnforcement(findings, { failOn: ['medium'] });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('filters out low when fail-on is medium (no high/medium present)', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, { failOn: ['medium'] });
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('preserves default behavior when failOn is undefined', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, {});
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('preserves default behavior when failOn is empty', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, { failOn: [] });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('filters only matched severities with mixed findings', () => {
    const findings = [makeFinding('high'), makeFinding('medium'), makeFinding('low')];
    const result = evaluateEnforcement(findings, { failOn: ['high'] });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
    expect(result.failingFindings[0].severity).toBe('high');
  });

  it('newOnly filters to new findings only', () => {
    const findings = [
      makeFinding('high', 'new'),
      makeFinding('medium', 'persisted'),
      makeFinding('low', 'resolved'),
    ];
    const result = evaluateEnforcement(findings, { failOn: ['high'], newOnly: true });
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
    expect(result.newFindingsCount).toBe(1);
    expect(result.persistedCount).toBe(1);
    expect(result.resolvedCount).toBe(1);
  });

  it('maxFindings triggers failure when exceeded', () => {
    const findings = [makeFinding('high'), makeFinding('medium')];
    const result = evaluateEnforcement(findings, { maxFindings: 1 });
    expect(result.shouldFail).toBe(true);
    expect(result.reason).toContain('maxFindings');
  });

  it('maxNewFindings triggers failure when exceeded', () => {
    const findings = [
      makeFinding('high', 'new'),
      makeFinding('medium', 'new'),
    ];
    const result = evaluateEnforcement(findings, { maxNewFindings: 1 });
    expect(result.shouldFail).toBe(true);
    expect(result.reason).toContain('maxNewFindings');
  });
});
