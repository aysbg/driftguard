import { resolve } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { describe, expect, it, afterAll } from 'vitest';

import { runCli } from '../helpers/run-cli.js';
import { ExitCode } from '../../src/errors.js';

const fixturesRoot = resolve('tests/fixtures');
const driftRepo = resolve(fixturesRoot, 'missing-route');

function cleanup(repo: string) {
  const baselineDir = resolve(repo, '.driftguard');
  if (existsSync(baselineDir)) {
    rmSync(baselineDir, { recursive: true, force: true });
  }
}

describe('Epic 4 baseline end-to-end', () => {
  afterAll(() => {
    cleanup(driftRepo);
  });

  it('scenario A: scan with nonexistent baseline shows comparison unavailable', async () => {
    cleanup(driftRepo);
    const result = await runCli([
      'scan',
      '--repo', driftRepo,
      '--spec', 'specs',
      '--baseline', 'doesnotexist',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.comparisonUnavailable).toContain('Baseline not found');
    expect(json.findings[0].baselineStatus).toBeUndefined();
  });

  it('scenario B: save baseline then rescan marks findings as persisted', async () => {
    cleanup(driftRepo);

    // Save baseline from the drift repo
    const saveResult = await runCli(['baseline', 'save', '--repo', driftRepo, '--spec', 'specs', '--code', 'src', '--name', 'default']);
    expect(saveResult.status).toBe(ExitCode.Ok);
    expect(saveResult.stdout).toContain('Baseline saved');
    expect(existsSync(resolve(driftRepo, '.driftguard', 'baseline-default.json'))).toBe(true);

    // Scan again with the baseline
    const scanResult = await runCli([
      'scan',
      '--repo', driftRepo,
      '--spec', 'specs',
      '--baseline', 'default',
      '--json',
    ]);

    expect(scanResult.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(scanResult.stdout);
    expect(json.baselineComparison).toBeDefined();
    expect(json.baselineComparison.baselineName).toBe('default');
    expect(json.findings.length).toBeGreaterThan(0);
    for (const finding of json.findings) {
      expect(finding.baselineStatus).toBe('persisted');
    }
  });

  it('findings include severityRationale and blastRadius in JSON output', async () => {
    cleanup(driftRepo);
    const result = await runCli([
      'scan',
      '--repo', driftRepo,
      '--spec', 'specs',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.length).toBeGreaterThan(0);
    const finding = json.findings[0];
    expect(finding.severityRationale).toBeDefined();
    expect(finding.severityRationale.factors).toBeInstanceOf(Array);
    expect(finding.blastRadius).toBeDefined();
    expect(finding.blastRadius.level).toBeDefined();
    expect(finding.blastRadius.impactedArtifacts).toBeInstanceOf(Array);
  });
});
