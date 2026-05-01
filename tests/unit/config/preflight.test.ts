import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { DriftGuardError, ExitCode } from '../../../src/errors.js';
import { preflightConfig } from '../../../src/config/preflight.js';

const fixturesRoot = resolve('tests/fixtures');

describe('preflightConfig', () => {
  it('returns scan input when repo, spec, and code paths exist', async () => {
    const repo = resolve(fixturesRoot, 'no-drift');
    const specPath = resolve(repo, 'specs/openapi.yml');
    const codePath = resolve(repo, 'src');

    const scanInput = await preflightConfig({
      repo,
      spec: [specPath],
      code: [codePath],
      configFile: null,
    });

    expect(scanInput).toEqual({
      repo,
      spec: [specPath],
      code: [codePath],
    });
  });

  it('invalid explicit spec path throws DriftGuardError', async () => {
    const repo = resolve(fixturesRoot, 'config-override');
    const missingSpecPath = resolve(repo, 'specs/does-not-exist.yml');

    const error = await preflightConfig({
      repo,
      spec: [missingSpecPath],
      code: [resolve(repo, 'src')],
      configFile: null,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('spec path does not exist');
  });

  it('throws DriftGuardError when repo path does not exist', async () => {
    const repo = resolve(fixturesRoot, 'does-not-exist');

    const error = await preflightConfig({
      repo,
      spec: [resolve(fixturesRoot, 'no-drift/specs/openapi.yml')],
      code: [resolve(fixturesRoot, 'no-drift/src')],
      configFile: null,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('repo path does not exist');
  });

  it('throws DriftGuardError when repo path is not a directory', async () => {
    const repo = resolve(fixturesRoot, 'not-a-directory');

    const error = await preflightConfig({
      repo,
      spec: [resolve(fixturesRoot, 'no-drift/specs/openapi.yml')],
      code: [resolve(fixturesRoot, 'no-drift/src')],
      configFile: null,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('repo path is not a directory');
  });

  it('throws DriftGuardError when code path does not exist', async () => {
    const repo = resolve(fixturesRoot, 'config-override');

    const error = await preflightConfig({
      repo,
      spec: [resolve(repo, 'specs/config-openapi.yml')],
      code: [resolve(repo, 'missing-src')],
      configFile: null,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({
      exitCode: ExitCode.ExecutionError,
    });
    expect((error as Error).message).toContain('code path does not exist');
  });
});
