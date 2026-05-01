import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';

import { DriftGuardError, ExitCode } from '../../../src/errors.js';
import type { DriftFinding } from '../../../src/types/finding.js';
import {
  saveBaseline,
  loadBaseline,
  listBaselines,
  clearBaseline,
} from '../../../src/baseline/manager.js';

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  }
});

function createTempRepo(): string {
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-manager-'));
  tempPaths.push(repo);
  return repo;
}

function makeFinding(id: string): DriftFinding {
  return {
    id,
    summary: `Summary ${id}`,
    severity: 'medium',
    confidence: 'high',
    mappingConfidence: 'medium',
    affectedFiles: ['src/routes/users.ts'],
    specReferences: ['specs/openapi.yml'],
  };
}

describe('saveBaseline', () => {
  it('creates .driftguard dir, writes baseline file, and returns its path', async () => {
    const repo = createTempRepo();
    const findings: DriftFinding[] = [makeFinding('f-1')];

    const filePath = await saveBaseline(repo, 'default', findings);

    expect(filePath).toBe(resolve(repo, '.driftguard', 'baseline-default.json'));
    const loaded = await loadBaseline(repo, 'default');
    expect(loaded.name).toBe('default');
    expect(loaded.formatVersion).toBe(1);
    expect(loaded.repoPath).toBe(repo);
    expect(loaded.createdAt).toBeTruthy();
    expect(loaded.findings).toHaveLength(1);
    expect(loaded.findings[0].id).toBe('f-1');
    expect(loaded.findings[0].summary).toBe('Summary f-1');
    expect(loaded.findings[0].severity).toBe('medium');
  });

  it('stores only the subset of fields from a DriftFinding', async () => {
    const repo = createTempRepo();
    const finding: DriftFinding = {
      ...makeFinding('f-2'),
      blastRadius: {
        level: 'moderate',
        impactedArtifacts: [{ type: 'endpoint', name: '/users' }],
      },
      confidence: 'low',
      mappingConfidence: 'low',
      method: 'GET',
      path: '/users',
      remediationHint: 'Fix it',
    };

    await saveBaseline(repo, 'subset', [finding]);
    const loaded = await loadBaseline(repo, 'subset');
    const stored = loaded.findings[0] as Record<string, unknown>;

    expect(stored.id).toBe('f-2');
    expect(stored.summary).toBe('Summary f-2');
    expect(stored.severity).toBe('medium');
    expect(stored.affectedFiles).toEqual(['src/routes/users.ts']);
    expect(stored.specReferences).toEqual(['specs/openapi.yml']);
    expect(stored.blastRadius).toEqual({
      level: 'moderate',
      impactedArtifacts: [{ type: 'endpoint', name: '/users' }],
    });
    expect(stored.confidence).toBeUndefined();
    expect(stored.method).toBeUndefined();
    expect(stored.remediationHint).toBeUndefined();
  });
});

describe('loadBaseline', () => {
  it('throws DriftGuardError when baseline file is missing', async () => {
    const repo = createTempRepo();

    const err = await loadBaseline(repo, 'missing').catch((reason: unknown) => reason);
    expect(err).toBeInstanceOf(DriftGuardError);
    expect((err as DriftGuardError).message).toContain('Baseline not found');
    expect((err as DriftGuardError).exitCode).toBe(ExitCode.ExecutionError);
  });

  it('throws DriftGuardError when formatVersion is not 1', async () => {
    const repo = createTempRepo();
    const dirPath = resolve(repo, '.driftguard');
    mkdirSync(dirPath, { recursive: true });
    const filePath = resolve(dirPath, 'baseline-wrong.json');

    writeFileSync(
      filePath,
      JSON.stringify({
        formatVersion: 2,
        name: 'wrong',
        createdAt: '2024-01-01T00:00:00Z',
        repoPath: repo,
        findings: [],
      }),
      'utf8',
    );

    const err = await loadBaseline(repo, 'wrong').catch((reason: unknown) => reason);
    expect(err).toBeInstanceOf(DriftGuardError);
    expect((err as DriftGuardError).message).toContain('format version mismatch');
    expect((err as DriftGuardError).exitCode).toBe(ExitCode.ExecutionError);
  });

  it('throws DriftGuardError for invalid JSON', async () => {
    const repo = createTempRepo();
    const dirPath = resolve(repo, '.driftguard');
    mkdirSync(dirPath, { recursive: true });
    const filePath = resolve(dirPath, 'baseline-bad.json');
    writeFileSync(filePath, 'not-json', 'utf8');

    const err = await loadBaseline(repo, 'bad').catch((reason: unknown) => reason);
    expect(err).toBeInstanceOf(DriftGuardError);
    expect((err as DriftGuardError).message).toContain('invalid JSON');
    expect((err as DriftGuardError).exitCode).toBe(ExitCode.ExecutionError);
  });
});

describe('listBaselines', () => {
  it('returns empty array when .driftguard does not exist', async () => {
    const repo = createTempRepo();
    const names = await listBaselines(repo);
    expect(names).toEqual([]);
  });

  it('returns names of all baseline files', async () => {
    const repo = createTempRepo();
    await saveBaseline(repo, 'alpha', []);
    await saveBaseline(repo, 'beta', []);

    const names = await listBaselines(repo);
    expect(names.sort()).toEqual(['alpha', 'beta']);
  });

  it('ignores non-baseline files in .driftguard', async () => {
    const repo = createTempRepo();
    await saveBaseline(repo, 'keep', []);
    writeFileSync(resolve(repo, '.driftguard', 'other.txt'), 'text', 'utf8');

    const names = await listBaselines(repo);
    expect(names).toEqual(['keep']);
  });
});

describe('clearBaseline', () => {
  it('deletes an existing baseline', async () => {
    const repo = createTempRepo();
    await saveBaseline(repo, 'gone', []);
    await loadBaseline(repo, 'gone'); // should exist

    await clearBaseline(repo, 'gone');

    const err = await loadBaseline(repo, 'gone').catch((reason: unknown) => reason);
    expect(err).toBeInstanceOf(DriftGuardError);
    expect((err as DriftGuardError).message).toContain('Baseline not found');
  });

  it('throws DriftGuardError when baseline is missing', async () => {
    const repo = createTempRepo();

    const err = await clearBaseline(repo, 'missing').catch((reason: unknown) => reason);
    expect(err).toBeInstanceOf(DriftGuardError);
    expect((err as DriftGuardError).message).toContain('Baseline not found');
    expect((err as DriftGuardError).exitCode).toBe(ExitCode.ExecutionError);
  });
});
