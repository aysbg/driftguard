import { relative, resolve } from 'node:path';
import { simpleGit } from 'simple-git';

import { DriftGuardError, ExitCode } from '../errors.js';
import { cleanupSnapshot, createSnapshot } from '../git/snapshot.js';
import { runScan } from '../orchestrator/run-scan.js';
import type { ScanInput } from '../types/config.js';
import type { DriftFinding } from '../types/finding.js';
import type { HistoricalScanResult, ScanResult } from '../types/scan.js';

export type { HistoricalScanResult } from '../types/scan.js';

export async function runHistoricalScan(
  input: ScanInput,
  sinceRef: string,
): Promise<{ result: ScanResult; historical?: HistoricalScanResult }> {
  await assertGitRepository(input.repo);

  const snapshot = await createSnapshot(input.repo, sinceRef);

  try {
    const historicalResult = await runScan(toSnapshotInput(input, snapshot.path));
    const currentResult = await runScan(input);
    const historical = compareHistoricalFindings(sinceRef, currentResult.findings, historicalResult.findings);
    const result: ScanResult = { ...currentResult, historical };

    return { result, historical };
  } finally {
    await cleanupSnapshot(snapshot);
  }
}

async function assertGitRepository(repoPath: string): Promise<void> {
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
    }
  } catch (error) {
    if (error instanceof DriftGuardError) throw error;
    throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
  }
}

function toSnapshotInput(input: ScanInput, snapshotPath: string): ScanInput {
  return {
    ...input,
    repo: snapshotPath,
    spec: input.spec.map((path) => rebasePath(input.repo, snapshotPath, path)),
    code: input.code.map((path) => rebasePath(input.repo, snapshotPath, path)),
  };
}

function rebasePath(repoPath: string, snapshotPath: string, path: string): string {
  const relativePath = relative(repoPath, path);

  if (relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith('/'))) {
    return resolve(snapshotPath, relativePath);
  }

  return path;
}

function compareHistoricalFindings(
  sinceRef: string,
  currentFindings: DriftFinding[],
  historicalFindings: DriftFinding[],
): HistoricalScanResult {
  const sortedCurrent = sortFindings(currentFindings);
  const sortedHistorical = sortFindings(historicalFindings);
  const currentIds = new Set(sortedCurrent.map((finding) => finding.id));
  const historicalIds = new Set(sortedHistorical.map((finding) => finding.id));

  return {
    sinceRef,
    currentFindings: sortedCurrent,
    historicalFindings: sortedHistorical,
    newFindings: sortedCurrent.filter((finding) => !historicalIds.has(finding.id)),
    resolvedFindings: sortedHistorical.filter((finding) => !currentIds.has(finding.id)),
    persistedFindings: sortedCurrent.filter((finding) => historicalIds.has(finding.id)),
  };
}

function sortFindings(findings: DriftFinding[]): DriftFinding[] {
  return [...findings].sort((a, b) => a.id.localeCompare(b.id));
}
