import { describe, expect, it } from 'vitest';
import { compareFindings } from '../../../src/baseline/comparator.js';
import type { DriftFinding } from '../../../src/types/finding.js';
import type { BaselineFile, BaselineFinding } from '../../../src/types/baseline.js';

function makeBaselineFinding(
  id: string,
  severity: 'high' | 'medium' | 'low' = 'low',
  blastLevel: 'unknown' | 'limited' | 'moderate' | 'broad' = 'unknown',
): BaselineFinding {
  return {
    id,
    summary: `Baseline ${id}`,
    severity,
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
    blastRadius: {
      level: blastLevel,
      impactedArtifacts: [],
    },
  };
}

function makeCurrentFinding(
  id: string,
  severity: 'high' | 'medium' | 'low' = 'low',
  blastLevel: 'unknown' | 'limited' | 'moderate' | 'broad' = 'unknown',
): DriftFinding {
  return {
    id,
    summary: `Current ${id}`,
    severity,
    confidence: 'high',
    mappingConfidence: 'high',
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
    blastRadius: {
      level: blastLevel,
      impactedArtifacts: [],
    },
  };
}

function makeBaseline(findings: BaselineFinding[]): BaselineFile {
  return {
    formatVersion: 1,
    name: 'test-baseline',
    createdAt: '2024-01-01T00:00:00Z',
    repoPath: '/repo',
    findings,
  };
}

describe('compareFindings', () => {
  it('classifies a finding in current but not in baseline as new', () => {
    const current = [makeCurrentFinding('f-1', 'low')];
    const baseline = makeBaseline([]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('new');
    expect(results[0].finding.id).toBe('f-1');
    expect(results[0].previousFinding).toBeUndefined();
  });

  it('classifies a finding unchanged in both as persisted', () => {
    const current = [makeCurrentFinding('f-1', 'medium', 'limited')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'medium', 'limited')]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('persisted');
    expect(results[0].finding.id).toBe('f-1');
    expect(results[0].previousFinding).toBeDefined();
    expect(results[0].previousFinding!.id).toBe('f-1');
  });

  it('classifies increased severity as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'high')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'medium')]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('worsened');
    expect(results[0].previousFinding!.severity).toBe('medium');
    expect(results[0].finding.severity).toBe('high');
  });

  it('classifies low→medium as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'medium')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('worsened');
  });

  it('classifies low→high as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'high')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('worsened');
  });

  it('classifies increased blast radius as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'low', 'moderate')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low', 'limited')]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('worsened');
  });

  it('classifies limited→broad as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'low', 'broad')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low', 'limited')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('worsened');
  });

  it('classifies moderate→broad as worsened', () => {
    const current = [makeCurrentFinding('f-1', 'low', 'broad')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low', 'moderate')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('worsened');
  });

  it('classifies a baseline finding missing from current as resolved', () => {
    const current: DriftFinding[] = [];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low')]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('resolved');
    expect(results[0].finding.id).toBe('f-1');
    expect(results[0].previousFinding).toBeDefined();
    expect(results[0].previousFinding!.id).toBe('f-1');
  });

  it('handles mixed scenarios correctly', () => {
    const current = [
      makeCurrentFinding('f-new', 'low'),
      makeCurrentFinding('f-persisted', 'medium', 'limited'),
      makeCurrentFinding('f-worsened', 'high', 'broad'),
    ];
    const baseline = makeBaseline([
      makeBaselineFinding('f-persisted', 'medium', 'limited'),
      makeBaselineFinding('f-worsened', 'medium', 'limited'),
      makeBaselineFinding('f-resolved', 'low'),
    ]);

    const results = compareFindings(current, baseline);

    expect(results).toHaveLength(4);

    const byId = Object.fromEntries(results.map((r) => [r.finding.id, r]));

    expect(byId['f-new'].status).toBe('new');
    expect(byId['f-persisted'].status).toBe('persisted');
    expect(byId['f-worsened'].status).toBe('worsened');
    expect(byId['f-resolved'].status).toBe('resolved');
    expect(byId['f-resolved'].previousFinding).toBeDefined();
    expect(byId['f-resolved'].previousFinding!.id).toBe('f-resolved');
  });

  it('treats same severity and blast radius as persisted', () => {
    const current = [makeCurrentFinding('f-1', 'high', 'broad')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'high', 'broad')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('persisted');
  });

  it('treats decreased severity as persisted', () => {
    const current = [makeCurrentFinding('f-1', 'low')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'high')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('persisted');
  });

  it('treats decreased blast radius as persisted', () => {
    const current = [makeCurrentFinding('f-1', 'low', 'limited')];
    const baseline = makeBaseline([makeBaselineFinding('f-1', 'low', 'broad')]);

    const results = compareFindings(current, baseline);

    expect(results[0].status).toBe('persisted');
  });
});
