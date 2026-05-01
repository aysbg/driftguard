import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executeScan } from '../../../src/commands/scan.js';

const fixturesRoot = resolve('tests/fixtures');

describe('executeScan with repeated flags', () => {
  it('collects multiple --spec values into one array', async () => {
    const exitCode = await executeScan(
      {
        repo: resolve(fixturesRoot, 'no-drift'),
        spec: [resolve(fixturesRoot, 'no-drift/specs/openapi.yml'), resolve(fixturesRoot, 'no-drift/docs/requirements.md')],
        code: [resolve(fixturesRoot, 'no-drift/src')],
      },
      {
        stdout: () => {},
        stderr: () => {},
      },
    );

    expect(exitCode).toBe(0);
  });

  it('collects multiple --code values into one array', async () => {
    const exitCode = await executeScan(
      {
        repo: resolve(fixturesRoot, 'no-drift'),
        spec: [resolve(fixturesRoot, 'no-drift/specs/openapi.yml')],
        code: [resolve(fixturesRoot, 'no-drift/src/routes'), resolve(fixturesRoot, 'no-drift/src')],
      },
      {
        stdout: () => {},
        stderr: () => {},
      },
    );

    expect(exitCode).toBe(0);
  });

  it('accepts both repeated --spec and --code values', async () => {
    const exitCode = await executeScan(
      {
        repo: resolve(fixturesRoot, 'no-drift'),
        spec: [resolve(fixturesRoot, 'no-drift/specs/openapi.yml'), resolve(fixturesRoot, 'no-drift/docs/requirements.md')],
        code: [resolve(fixturesRoot, 'no-drift/src'), resolve(fixturesRoot, 'no-drift/src/routes')],
      },
      {
        stdout: () => {},
        stderr: () => {},
      },
    );

    expect(exitCode).toBe(0);
  });
});