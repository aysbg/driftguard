import { describe, expect, it } from 'vitest';

import { extractBusinessRules } from '../../../src/ingestion/business-rules.js';

describe('extractBusinessRules', () => {
  it('detects heading containing "Business Rule"', () => {
    const rules = extractBusinessRules(
      'docs/spec.md',
      [
        '# Introduction',
        '',
        '## Business Rule: Payment Validation',
        'Payments must be validated before fulfillment.',
        '',
        '## API Endpoints',
        '- POST /payments',
      ].join('\n'),
    );

    expect(rules).toEqual([
      {
        id: 'business-rule-payment-validation',
        title: 'Business Rule: Payment Validation',
        description: 'Payments must be validated before fulfillment.',
        filePath: 'docs/spec.md',
        startLine: 3,
        endLine: 5,
      },
    ]);
  });

  it('detects heading starting with BR-*', () => {
    const rules = extractBusinessRules(
      'docs/spec.md',
      [
        '# Intro',
        '',
        '## BR-002: GDPR Consent',
        'Collect explicit consent before processing personal data.',
      ].join('\n'),
    );

    expect(rules).toEqual([
      {
        id: 'BR-002',
        title: 'BR-002: GDPR Consent',
        description: 'Collect explicit consent before processing personal data.',
        filePath: 'docs/spec.md',
        startLine: 3,
        endLine: 4,
      },
    ]);
  });

  it('does not detect non-rule sections', () => {
    const rules = extractBusinessRules(
      'docs/spec.md',
      [
        '# Introduction',
        'Overview text',
        '',
        '## API Endpoints',
        '- GET /users',
      ].join('\n'),
    );

    expect(rules).toEqual([]);
  });

  it('extracts multiple rules in one file sorted by startLine', () => {
    const rules = extractBusinessRules(
      'docs/spec.md',
      [
        '## Constraint: Immutable Audit Log',
        'Audit records cannot be altered once written.',
        '',
        '## BR-010: Strong Passwords',
        'Passwords must have at least 12 characters.',
        '',
        '## Rule: Session Timeout',
        'Sessions expire after 30 minutes of inactivity.',
      ].join('\n'),
    );

    expect(rules).toEqual([
      {
        id: 'constraint-immutable-audit-log',
        title: 'Constraint: Immutable Audit Log',
        description: 'Audit records cannot be altered once written.',
        filePath: 'docs/spec.md',
        startLine: 1,
        endLine: 3,
      },
      {
        id: 'BR-010',
        title: 'BR-010: Strong Passwords',
        description: 'Passwords must have at least 12 characters.',
        filePath: 'docs/spec.md',
        startLine: 4,
        endLine: 6,
      },
      {
        id: 'rule-session-timeout',
        title: 'Rule: Session Timeout',
        description: 'Sessions expire after 30 minutes of inactivity.',
        filePath: 'docs/spec.md',
        startLine: 7,
        endLine: 8,
      },
    ]);
  });
});
