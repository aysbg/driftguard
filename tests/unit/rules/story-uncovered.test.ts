import { describe, expect, it } from 'vitest';
import { evaluateStoryUncovered } from '../../../src/rules/story-uncovered.js';
import type { DriftFinding } from '../../../src/types/finding.js';
import type { Story } from '../../../src/types/spec.js';

const baseFinding: DriftFinding = {
  id: 'data-model-exists:Order|docs/models.md',
  summary: 'Order is not implemented',
  severity: 'high',
  confidence: 'high',
  mappingConfidence: 'medium',
  affectedFiles: ['docs/models.md'],
  specReferences: ['docs/models.md'],
};

function story(overrides: Partial<Story>): Story {
  return {
    id: 'US-1',
    title: 'Place an order',
    description: 'Customers can place orders',
    dependencies: [],
    filePath: 'docs/stories.md',
    ...overrides,
  };
}

describe('evaluateStoryUncovered', () => {
  it('returns no findings when all dependencies are covered', () => {
    const findings = evaluateStoryUncovered(
      [story({ dependencies: ['Order'] })],
      [],
    );

    expect(findings).toEqual([]);
  });

  it('creates a finding for one uncovered dependency', () => {
    const findings = evaluateStoryUncovered(
      [story({ dependencies: ['Order'] })],
      [baseFinding],
    );

    expect(findings).toEqual([
      {
        id: 'story-uncovered:US-1|docs/stories.md',
        summary: "Story 'Place an order' depends on uncovered entities: Order",
        severity: 'low',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['docs/stories.md'],
        specReferences: ['docs/stories.md'],
        explanation: {
          expected: 'all dependencies implemented in code',
          found: 'Order are uncovered',
          reason: 'Story dependencies are not fully implemented',
        },
      },
    ]);
  });

  it('returns no findings for a story with no dependencies', () => {
    const findings = evaluateStoryUncovered([story({ dependencies: [] })], [baseFinding]);

    expect(findings).toEqual([]);
  });

  it('lists only uncovered dependencies when some are covered', () => {
    const findings = evaluateStoryUncovered(
      [story({ dependencies: ['Order', 'Payment', 'BR-001'] })],
      [
        baseFinding,
        {
          ...baseFinding,
          id: 'business-rule-referenced:BR-001|docs/rules.md',
        },
      ],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.summary).toBe(
      "Story 'Place an order' depends on uncovered entities: Order, BR-001",
    );
    expect(findings[0]?.explanation?.found).toBe('Order, BR-001 are uncovered');
  });

  it('uses low severity for story uncovered findings', () => {
    const findings = evaluateStoryUncovered(
      [story({ dependencies: ['order'] })],
      [baseFinding],
    );

    expect(findings[0]?.severity).toBe('low');
  });
});
