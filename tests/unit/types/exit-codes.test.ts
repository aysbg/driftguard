import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

async function loadErrors() {
  return await import(resolve('dist/errors.js'));
}

describe('ExitCode', () => {
  it('Ok equals 0', async () => {
    const { ExitCode } = await loadErrors();
    expect(ExitCode.Ok).toBe(0);
  });

  it('DriftFound equals 1', async () => {
    const { ExitCode } = await loadErrors();
    expect(ExitCode.DriftFound).toBe(1);
  });

  it('ExecutionError equals 2', async () => {
    const { ExitCode } = await loadErrors();
    expect(ExitCode.ExecutionError).toBe(2);
  });
});

describe('DriftGuardError', () => {
  it('defaults exitCode to ExecutionError', async () => {
    const { DriftGuardError, ExitCode } = await loadErrors();
    const error = new DriftGuardError('test error');
    expect(error.exitCode).toBe(ExitCode.ExecutionError);
  });

  it('carries message', async () => {
    const { DriftGuardError } = await loadErrors();
    const error = new DriftGuardError('something went wrong');
    expect(error.message).toBe('something went wrong');
  });

  it('is instance of Error', async () => {
    const { DriftGuardError } = await loadErrors();
    const error = new DriftGuardError('test');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof DriftGuardError).toBe(true);
  });
});