import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { evaluateBusinessRuleReferenced } from '../../../src/rules/business-rule-referenced.js';
import type { RepositoryIndex } from '../../../src/types/repository.js';
import type { BusinessRule } from '../../../src/types/spec.js';

let tempRepos: string[] = [];

afterEach(() => {
  for (const repo of tempRepos) {
    rmSync(repo, { recursive: true, force: true });
  }
  tempRepos = [];
});

describe('evaluateBusinessRuleReferenced', () => {
  it('returns no findings when a rule is referenced by ID in code', () => {
    const repository = repositoryWithFile('src/checkout.ts', `
      export function checkout() {
        return 'BR-001';
      }
    `);

    expect(evaluateBusinessRuleReferenced([businessRule()], repository)).toEqual([]);
  });

  it('returns no findings when a rule is referenced by a title keyword in code', () => {
    const repository = repositoryWithFile('src/checkout.ts', `
      export function enforceDiscountApproval() {
        return true;
      }
    `);

    expect(
      evaluateBusinessRuleReferenced(
        [businessRule({ id: 'BR-002', title: 'Require discount approval' })],
        repository,
      ),
    ).toEqual([]);
  });

  it('creates a finding when a rule is not referenced anywhere', () => {
    const repository = repositoryWithFile('src/checkout.ts', `
      export function checkout() {
        return 'unrelated';
      }
    `);

    expect(evaluateBusinessRuleReferenced([businessRule()], repository)).toEqual([
      {
        id: 'business-rule-referenced:BR-001|docs/rules.md',
        summary: "Business rule 'Require manager approval' is documented but not referenced in code",
        severity: 'medium',
        confidence: 'medium',
        mappingConfidence: 'medium',
        affectedFiles: ['docs/rules.md'],
        specReferences: ['docs/rules.md'],
        explanation: {
          expected: 'code references to business rule',
          found: 'no references to rule ID or title keywords in code',
          reason: 'Business rule is documented but not implemented or referenced',
        },
      },
    ]);
  });

  it('does not create false positives from titles containing only short words', () => {
    const repository = repositoryWithFile('src/flags.ts', `
      const isEnabled = true;
      const to = 'x';
    `);

    expect(
      evaluateBusinessRuleReferenced(
        [businessRule({ id: 'BR-003', title: 'A is to be' })],
        repository,
      ),
    ).toEqual([
      {
        id: 'business-rule-referenced:BR-003|docs/rules.md',
        summary: "Business rule 'A is to be' is documented but not referenced in code",
        severity: 'medium',
        confidence: 'medium',
        mappingConfidence: 'medium',
        affectedFiles: ['docs/rules.md'],
        specReferences: ['docs/rules.md'],
        explanation: {
          expected: 'code references to business rule',
          found: 'no references to rule ID or title keywords in code',
          reason: 'Business rule is documented but not implemented or referenced',
        },
      },
    ]);
  });
});

function repositoryWithFile(filePath: string, contents: string): RepositoryIndex {
  const repo = mkdtempSync(join(tmpdir(), 'driftguard-business-rule-'));
  tempRepos.push(repo);

  const absolutePath = join(repo, filePath);
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(absolutePath, contents);

  return {
    files: [
      {
        filePath: absolutePath,
        routes: [],
      },
    ],
  };
}

function businessRule(overrides: Partial<BusinessRule> = {}): BusinessRule {
  return {
    id: 'BR-001',
    title: 'Require manager approval',
    description: 'Discounts over a threshold require approval.',
    filePath: 'docs/rules.md',
    startLine: 1,
    endLine: 3,
    ...overrides,
  };
}
