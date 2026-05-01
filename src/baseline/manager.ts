import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DriftGuardError, ExitCode } from '../errors.js';
import type { BaselineFile, BaselineFinding } from '../types/baseline.js';
import type { DriftFinding } from '../types/finding.js';

function baselineDir(repoPath: string): string {
  return resolve(repoPath, '.driftguard');
}

function baselinePath(repoPath: string, name: string): string {
  return resolve(baselineDir(repoPath), `baseline-${name}.json`);
}

function toBaselineFinding(finding: DriftFinding): BaselineFinding {
  return {
    id: finding.id,
    summary: finding.summary,
    severity: finding.severity,
    affectedFiles: finding.affectedFiles,
    specReferences: finding.specReferences,
    blastRadius: finding.blastRadius,
  };
}

export async function saveBaseline(
  repoPath: string,
  name: string,
  findings: DriftFinding[],
): Promise<string> {
  const dir = baselineDir(repoPath);
  await mkdir(dir, { recursive: true });

  const baseline: BaselineFile = {
    formatVersion: 1,
    name,
    createdAt: new Date().toISOString(),
    repoPath,
    findings: findings.map(toBaselineFinding),
  };

  const filePath = baselinePath(repoPath, name);
  await writeFile(filePath, JSON.stringify(baseline, null, 2), 'utf8');
  return filePath;
}

export async function loadBaseline(repoPath: string, name: string): Promise<BaselineFile> {
  const filePath = baselinePath(repoPath, name);

  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new DriftGuardError(
        `Baseline not found: ${name}`,
        ExitCode.ExecutionError,
      );
    }
    throw new DriftGuardError(
      `Failed to read baseline: ${name}`,
      ExitCode.ExecutionError,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new DriftGuardError(
      `Baseline file is invalid JSON: ${name}`,
      ExitCode.ExecutionError,
    );
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'formatVersion' in parsed &&
    (parsed as Record<string, unknown>).formatVersion !== 1
  ) {
    throw new DriftGuardError(
      `Baseline format version mismatch: ${name}`,
      ExitCode.ExecutionError,
    );
  }

  return parsed as BaselineFile;
}

export async function listBaselines(repoPath: string): Promise<string[]> {
  const dir = baselineDir(repoPath);

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return [];
    }
    throw new DriftGuardError(
      `Failed to list baselines: ${error instanceof Error ? error.message : 'unknown error'}`,
      ExitCode.ExecutionError,
    );
  }

  return entries
    .filter((entry) => entry.startsWith('baseline-') && entry.endsWith('.json'))
    .map((entry) => entry.slice('baseline-'.length, -'.json'.length));
}

export async function clearBaseline(repoPath: string, name: string): Promise<void> {
  const filePath = baselinePath(repoPath, name);

  try {
    await unlink(filePath);
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new DriftGuardError(
        `Baseline not found: ${name}`,
        ExitCode.ExecutionError,
      );
    }
    throw new DriftGuardError(
      `Failed to clear baseline: ${name}`,
      ExitCode.ExecutionError,
    );
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
