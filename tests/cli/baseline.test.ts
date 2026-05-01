import { resolve } from 'node:path';
import { rmSync, existsSync } from 'node:fs';
import { describe, expect, it, afterEach } from 'vitest';

import { runCli } from '../helpers/run-cli.js';
import { ExitCode } from '../../src/errors.js';

const fixturesRoot = resolve('tests/fixtures');

describe('baseline command', () => {
  const repo = resolve(fixturesRoot, 'no-drift');

  afterEach(() => {
    const baselineDir = resolve(repo, '.driftguard');
    if (existsSync(baselineDir)) {
      rmSync(baselineDir, { recursive: true, force: true });
    }
  });

  it('list returns no baselines when none exist', async () => {
    const result = await runCli(['baseline', 'list', '--repo', repo]);
    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('No baselines found');
  });

  it('save creates a baseline file', async () => {
    const result = await runCli(['baseline', 'save', '--repo', repo, '--name', 'test1']);
    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('Baseline saved');
    expect(existsSync(resolve(repo, '.driftguard', 'baseline-test1.json'))).toBe(true);
  });

  it('list shows saved baseline names', async () => {
    await runCli(['baseline', 'save', '--repo', repo, '--name', 'alpha']);
    await runCli(['baseline', 'save', '--repo', repo, '--name', 'beta']);

    const result = await runCli(['baseline', 'list', '--repo', repo]);
    expect(result.status).toBe(ExitCode.Ok);
    const lines = result.stdout.trim().split('\n');
    expect(lines).toContain('alpha');
    expect(lines).toContain('beta');
  });

  it('clear removes a baseline', async () => {
    await runCli(['baseline', 'save', '--repo', repo, '--name', 'delme']);
    expect(existsSync(resolve(repo, '.driftguard', 'baseline-delme.json'))).toBe(true);

    const result = await runCli(['baseline', 'clear', '--repo', repo, '--name', 'delme']);
    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('Baseline cleared');
    expect(existsSync(resolve(repo, '.driftguard', 'baseline-delme.json'))).toBe(false);
  });

  it('clear on nonexistent baseline exits 2', async () => {
    const result = await runCli(['baseline', 'clear', '--repo', repo, '--name', 'nonexistent']);
    expect(result.status).toBe(ExitCode.ExecutionError);
    expect(result.stderr).toContain('Baseline not found');
  });
});
