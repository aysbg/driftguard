import { describe, expect, it } from 'vitest';
import {
  dataModelExistsId,
  businessRuleReferencedId,
  storyUncoveredId,
  extraRouteNotInSpecId,
  dataModelMissingSeverity,
  businessRuleUnreferencedSeverity,
  storyUncoveredSeverity,
  extraRouteSeverity,
  exactMatchConfidence,
  heuristicConfidence,
} from '../../../src/rules/finding-conventions.js';
import type { FindingSeverity, FindingConfidence } from '../../../src/types/finding.js';

describe('finding-conventions ID helpers', () => {
  it('dataModelExistsId formats correctly', () => {
    expect(dataModelExistsId('Order', 'specs/openapi.yml')).toBe(
      'data-model-exists:Order|specs/openapi.yml',
    );
  });

  it('businessRuleReferencedId formats correctly', () => {
    expect(businessRuleReferencedId('auth-001', 'specs/rules.yml')).toBe(
      'business-rule-referenced:auth-001|specs/rules.yml',
    );
  });

  it('storyUncoveredId formats correctly', () => {
    expect(storyUncoveredId('US-42', 'docs/roadmap.md')).toBe(
      'story-uncovered:US-42|docs/roadmap.md',
    );
  });

  it('extraRouteNotInSpecId formats correctly', () => {
    expect(extraRouteNotInSpecId('GET', '/health', 'src/routes/health.ts')).toBe(
      'extra-route-not-in-spec:GET|/health|src/routes/health.ts',
    );
  });
});

describe('finding-conventions severity defaults', () => {
  it('dataModelMissingSeverity is high', () => {
    expect(dataModelMissingSeverity).toBe('high');
    expect(dataModelMissingSeverity).toMatchInlineSnapshot('"high"');
  });

  it('businessRuleUnreferencedSeverity is medium', () => {
    expect(businessRuleUnreferencedSeverity).toBe('medium');
    expect(businessRuleUnreferencedSeverity).toMatchInlineSnapshot('"medium"');
  });

  it('storyUncoveredSeverity is low', () => {
    expect(storyUncoveredSeverity).toBe('low');
    expect(storyUncoveredSeverity).toMatchInlineSnapshot('"low"');
  });

  it('extraRouteSeverity is medium', () => {
    expect(extraRouteSeverity).toBe('medium');
    expect(extraRouteSeverity).toMatchInlineSnapshot('"medium"');
  });
});

describe('finding-conventions confidence defaults', () => {
  it('exactMatchConfidence is high', () => {
    expect(exactMatchConfidence).toBe('high');
    expect(exactMatchConfidence).toMatchInlineSnapshot('"high"');
  });

  it('heuristicConfidence is medium', () => {
    expect(heuristicConfidence).toBe('medium');
    expect(heuristicConfidence).toMatchInlineSnapshot('"medium"');
  });
});

describe('type safety', () => {
  it('severity constants are FindingSeverity', () => {
    const val: FindingSeverity = dataModelMissingSeverity;
    expect(val).toBe('high');
  });

  it('confidence constants are FindingConfidence', () => {
    const val: FindingConfidence = exactMatchConfidence;
    expect(val).toBe('high');
  });

  it('ID functions return string', () => {
    const id: string = dataModelExistsId('Order', 'specs/openapi.yml');
    expect(id).toBe('data-model-exists:Order|specs/openapi.yml');
  });
});