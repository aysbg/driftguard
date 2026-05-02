import { describe, expect, it } from 'vitest';

import {
  shouldWriteBack,
  findingsToDeviationReports,
} from '../../../src/foundation/deviation-reporter.js';
import type { DriftFinding } from '../../../src/types/finding.js';

function makeFinding(overrides: Partial<DriftFinding> & { id: string; summary: string }): DriftFinding {
  return {
    severity: 'medium',
    confidence: 'high',
    mappingConfidence: 'medium',
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
    ...overrides,
  };
}

describe('shouldWriteBack', () => {
  it('returns null when config is undefined', () => {
    expect(shouldWriteBack(undefined)).toBeNull();
  });

  it('returns null when not all conditions are met', () => {
    expect(shouldWriteBack({ enabled: true })).toBeNull();
    expect(shouldWriteBack({ enabled: true, writeBack: true })).toBeNull();
    expect(shouldWriteBack({ writeBack: true, projectId: 'p1' })).toBeNull();
    expect(shouldWriteBack({ enabled: true, projectId: 'p1' })).toBeNull();
  });

  it('returns options when enabled, writeBack, and projectId are all set', () => {
    const config = { enabled: true, writeBack: true, projectId: 'proj-42' };
    expect(shouldWriteBack(config)).toEqual({ enabled: true, projectId: 'proj-42' });
  });
});

describe('findingsToDeviationReports', () => {
  it('maps findings correctly', () => {
    const findings: DriftFinding[] = [
      makeFinding({ id: 'f-1', summary: 'Route missing' }),
      makeFinding({ id: 'f-2', summary: 'Section stale', affectedFiles: ['docs/adr.md'] }),
    ];

    const reports = findingsToDeviationReports(findings);
    expect(reports).toHaveLength(2);
    expect(reports[0]).toEqual({
      findingId: 'f-1',
      severity: 'medium',
      message: 'Route missing',
      filePath: 'src/routes/users.ts',
    });
    expect(reports[1]).toEqual({
      findingId: 'f-2',
      severity: 'medium',
      message: 'Section stale',
      filePath: 'docs/adr.md',
    });
  });

  it('includes remediationHint when present', () => {
    const findings: DriftFinding[] = [
      makeFinding({ id: 'f-3', summary: 'Mismatch', remediationHint: 'Add validation' }),
    ];

    const reports = findingsToDeviationReports(findings);
    expect(reports[0].message).toBe('Mismatch — Hint: Add validation');
  });

  it('uses unknown filePath when affectedFiles is empty', () => {
    const findings: DriftFinding[] = [
      makeFinding({ id: 'f-4', summary: 'Orphan', affectedFiles: [] }),
    ];

    const reports = findingsToDeviationReports(findings);
    expect(reports[0].filePath).toBe('unknown');
  });
});
