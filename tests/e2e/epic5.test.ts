import { resolve } from 'node:path';
import { rmSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it, afterAll } from 'vitest';

import { runCli } from '../helpers/run-cli.js';
import { ExitCode } from '../../src/errors.js';

const tempPaths: string[] = [];

function cleanup(repo: string) {
  const baselineDir = resolve(repo, '.driftguard');
  if (existsSync(baselineDir)) {
    rmSync(baselineDir, { recursive: true, force: true });
  }
}

function createTempRepo(): string {
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-epic5-'));
  tempPaths.push(repo);
  cleanup(repo);
  return repo;
}

describe('Epic 5 Foundation scan end-to-end', () => {
  afterAll(() => {
    for (const repo of tempPaths) {
      cleanup(repo);
      if (existsSync(repo)) {
        rmSync(repo, { recursive: true, force: true });
      }
    }
  });

  it.skip('TODO: E2E Foundation scan flow is not yet implemented', async () => {
    // E2E Foundation scan flow skipped because mocking FoundationMcpClientImpl
    // inside a spawned CLI process is too complex. The CLI runs as a separate
    // node child process (dist/cli.js) so vi.mock does not apply. To test this
    // properly we would need:
    //   - a dependency-injection hook for the MCP client in the CLI entrypoint,
    //   - or an environment-based test double that the CLI can load.
    //
    // Once such a mechanism exists, the test should:
    //   1. Create a temp repo with a .driftguard.yml that enables foundation with projectId
    //   2. Mock FoundationMcpClientImpl to return spec content that maps to a local code file
    //   3. Run scan and assert the scan completes with correct status
    expect(true).toBe(true);
  });
});
