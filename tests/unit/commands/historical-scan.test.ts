import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolve } from 'node:path';

import type { DriftFinding } from '../../../src/types/finding.js';
import type { ScanInput } from '../../../src/types/config.js';

const checkIsRepo = vi.fn();
const createSnapshot = vi.fn();
const cleanupSnapshot = vi.fn();
const runScan = vi.fn();

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({ checkIsRepo })),
}));

vi.mock('../../../src/git/snapshot.js', () => ({
  createSnapshot,
  cleanupSnapshot,
}));

vi.mock('../../../src/orchestrator/run-scan.js', () => ({
  runScan,
}));

const repo = resolve('/repo');
const snapshotPath = resolve('/tmp/driftguard-snap');

const input: ScanInput = {
  repo,
  spec: [resolve(repo, 'docs/openapi.yml')],
  code: [resolve(repo, 'src')],
};

function finding(id: string): DriftFinding {
  return {
    id,
    summary: id,
    severity: 'high',
    confidence: 'high',
    mappingConfidence: 'high',
    affectedFiles: [],
    specReferences: [],
  };
}

describe('runHistoricalScan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkIsRepo.mockResolvedValue(true);
    createSnapshot.mockResolvedValue({ path: snapshotPath, ref: 'HEAD~1' });
  });

  it('compares HEAD~1 findings against current findings by id', async () => {
    const historicalFindings = [finding('persisted'), finding('resolved')];
    const currentFindings = [finding('new'), finding('persisted')];
    runScan
      .mockResolvedValueOnce({ status: 'drift_found', totalFindings: 2, findings: historicalFindings, warnings: [], config: input })
      .mockResolvedValueOnce({ status: 'drift_found', totalFindings: 2, findings: currentFindings, warnings: [], config: input });

    const { runHistoricalScan } = await import('../../../src/commands/historical-scan.js');
    const { result, historical } = await runHistoricalScan(input, 'HEAD~1');

    expect(checkIsRepo).toHaveBeenCalledOnce();
    expect(createSnapshot).toHaveBeenCalledWith(repo, 'HEAD~1');
    expect(runScan).toHaveBeenNthCalledWith(1, {
      ...input,
      repo: snapshotPath,
      spec: [resolve(snapshotPath, 'docs/openapi.yml')],
      code: [resolve(snapshotPath, 'src')],
    });
    expect(runScan).toHaveBeenNthCalledWith(2, input);
    expect(result.historical).toBe(historical);
    expect(historical).toMatchObject({ sinceRef: 'HEAD~1' });
    expect(historical?.newFindings.map((f) => f.id)).toEqual(['new']);
    expect(historical?.resolvedFindings.map((f) => f.id)).toEqual(['resolved']);
    expect(historical?.persistedFindings.map((f) => f.id)).toEqual(['persisted']);
    expect(cleanupSnapshot).toHaveBeenCalledWith({ path: snapshotPath, ref: 'HEAD~1' });
  });

  it('cleans up the snapshot when a scan fails', async () => {
    runScan.mockRejectedValueOnce(new Error('scan failed'));

    const { runHistoricalScan } = await import('../../../src/commands/historical-scan.js');
    await expect(runHistoricalScan(input, 'HEAD~1')).rejects.toThrow('scan failed');

    expect(cleanupSnapshot).toHaveBeenCalledWith({ path: snapshotPath, ref: 'HEAD~1' });
  });
});
