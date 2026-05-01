import { describe, expect, it } from 'vitest';
import { evaluateEnforcement } from '../../../src/thresholds/enforcement.js';
import type { DriftFinding } from '../../../src/types/finding.js';

function makeFinding(severity: 'high' | 'medium' | 'low'): DriftFinding {
  return {
    id: `f-${severity}`,
    summary: `A ${severity} finding`,
    severity,
    confidence: 'high',
    mappingConfidence: 'high',
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
  };
}

describe('evaluateEnforcement', () => {
  it('fails on high severity when high is present', () => {
    const findings = [makeFinding('high')];
    const result = evaluateEnforcement(findings, ['high']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('does not fail on high-only when only medium finding present', () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, ['high']);
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('fails on medium when medium finding present', () => {
    const findings = [makeFinding('medium')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('cascades — fail-on medium also catches high finding', () => {
    const findings = [makeFinding('high')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('filters out low when fail-on is medium (no high/medium present)', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, ['medium']);
    expect(result.shouldFail).toBe(false);
    expect(result.failingFindings).toHaveLength(0);
  });

  it('preserves default behavior when failOn is undefined', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, undefined);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('preserves default behavior when failOn is empty', () => {
    const findings = [makeFinding('low')];
    const result = evaluateEnforcement(findings, []);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
  });

  it('filters only matched severities with mixed findings', () => {
    const findings = [makeFinding('high'), makeFinding('medium'), makeFinding('low')];
    const result = evaluateEnforcement(findings, ['high']);
    expect(result.shouldFail).toBe(true);
    expect(result.failingFindings).toHaveLength(1);
    expect(result.failingFindings[0].severity).toBe('high');
  });
});
