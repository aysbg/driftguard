import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';

import { DriftGuardError, ExitCode } from '../../../src/errors.js';
import { resolveConfig } from '../../../src/config/resolver.js';

const fixturesRoot = resolve('tests/fixtures');
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

describe('resolveConfig', () => {
  it('resolves flags-only absolute repo, spec, and code paths', async () => {
    const repo = resolve(fixturesRoot, 'no-drift');
    const specPath = resolve(repo, 'specs/openapi.yml');
    const codePath = resolve(repo, 'src/routes');

    const resolvedConfig = await resolveConfig({
      repo,
      spec: [specPath],
      code: [codePath],
    });

    expect(resolvedConfig).toEqual({
      repo,
      spec: [specPath],
      code: [codePath],
      configFile: null,
    });
  });

  it('resolves config-only .driftguard.yml relative to repo root', async () => {
    const repo = resolve(fixturesRoot, 'config-override');

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig).toEqual({
      repo,
      spec: [resolve(repo, 'specs/config-openapi.yml')],
      code: [resolve(repo, 'src')],
      configFile: resolve(repo, '.driftguard.yml'),
    });
  });

  it('flags override config', async () => {
    const repo = resolve(fixturesRoot, 'config-override');

    const resolvedConfig = await resolveConfig({
      repo,
      spec: ['specs/override-openapi.yml'],
    });

    expect(resolvedConfig.spec).toEqual([resolve(repo, 'specs/override-openapi.yml')]);
    expect(resolvedConfig.code).toEqual([resolve(repo, 'src')]);
    expect(resolvedConfig.configFile).toBe(resolve(repo, '.driftguard.yml'));
  });

  it('uses defaults when config file is absent', async () => {
    const repo = resolve(fixturesRoot, 'no-drift');

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig).toEqual({
      repo,
      spec: [resolve(repo, 'docs')],
      code: [resolve(repo, 'src')],
      configFile: null,
    });
  });

  it('throws DriftGuardError when explicit config file is missing', async () => {
    const repo = resolve(fixturesRoot, 'no-drift');

    const error = await resolveConfig(
      {
        repo,
        config: 'missing.yml',
      },
      {
        cwd: repo,
      },
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('config file does not exist');
  });

  it('rejects glob syntax in config paths', async () => {
    const repo = createTempRepo('spec:\n  - specs/*.yml\ncode:\n  - src\n');

    const error = await resolveConfig({ repo }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('glob');
  });

  it('resolves CI config from .driftguard.yml', async () => {
    const repo = createTempRepo(
      'spec:\n  - docs\ncode:\n  - src\nci:\n  failOn:\n    - high\n  changedOnly: true\n  baseRef: main\n  sarif: results.sarif\n',
    );

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.ci).toEqual({
      failOn: ['high'],
      changedOnly: true,
      baseRef: 'main',
      sarif: 'results.sarif',
    });
  });

  it('resolves CI config with string failOn', async () => {
    const repo = createTempRepo(
      'spec:\n  - docs\ncode:\n  - src\nci:\n  failOn: high,medium\n',
    );

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.ci).toEqual({
      failOn: ['high', 'medium'],
    });
  });

  it('rejects invalid failOn severity in config', async () => {
    const repo = createTempRepo(
      'spec:\n  - docs\ncode:\n  - src\nci:\n  failOn:\n    - critical\n',
    );

    const error = await resolveConfig({ repo }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('critical');
    expect((error as Error).message).toContain('high, medium, low');
  });

  it('rejects uppercase failOn severity with suggestion', async () => {
    const repo = createTempRepo(
      'spec:\n  - docs\ncode:\n  - src\nci:\n  failOn:\n    - HIGH\n',
    );

    const error = await resolveConfig({ repo }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect((error as Error).message).toContain('HIGH');
    expect((error as Error).message).toContain('high');
  });

  it('resolves CI config without CI section', async () => {
    const repo = createTempRepo('spec:\n  - docs\ncode:\n  - src\n');

    const resolvedConfig = await resolveConfig({ repo });

    expect(resolvedConfig.ci).toBeUndefined();
  });
});
