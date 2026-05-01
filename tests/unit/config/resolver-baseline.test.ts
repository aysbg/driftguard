import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';

import { resolveConfig } from '../../../src/config/resolver.js';

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  }
});

function createTempRepo(configContent: string): string {
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-resolver-'));
  tempPaths.push(repo);
  writeFileSync(resolve(repo, '.driftguard.yml'), configContent, 'utf8');
  return repo;
}

describe('resolveConfig baseline and thresholds', () => {
  it('resolves baseline from config file', async () => {
    const repo = createTempRepo('baseline: default\nspec:\n  - docs\ncode:\n  - src\n');

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.baseline).toBe('default');
  });

  it('CLI --baseline overrides config file baseline', async () => {
    const repo = createTempRepo('baseline: default\nspec:\n  - docs\ncode:\n  - src\n');

    const resolvedConfig = await resolveConfig({ repo, baseline: 'override' });

    expect(resolvedConfig.baseline).toBe('override');
  });

  it('resolves ci thresholds from config file', async () => {
    const repo = createTempRepo(
      'spec:\n  - docs\ncode:\n  - src\nci:\n  thresholds:\n    maxFindings: 5\n    maxNewFindings: 3\n    failOnNewOnly: true\n',
    );

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.ci).toBeDefined();
    expect(resolvedConfig.ci?.thresholds).toEqual({
      maxFindings: 5,
      maxNewFindings: 3,
      failOnNewOnly: true,
    });
  });

  it('config without baseline or thresholds is still valid', async () => {
    const repo = createTempRepo('spec:\n  - docs\ncode:\n  - src\n');

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.baseline).toBeUndefined();
    expect(resolvedConfig.ci).toBeUndefined();
  });
});
