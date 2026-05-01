import { constants } from 'node:fs';
import { access, stat } from 'node:fs/promises';

import { DriftGuardError, ExitCode } from '../errors.js';
import type { ResolvedConfig, ScanInput } from '../types/config.js';

export async function preflightConfig(config: ResolvedConfig): Promise<ScanInput> {
  await assertRepoPath(config.repo);

  if (config.configFile !== null) {
    await assertReadablePath(config.configFile, 'config file');
  }

  await assertReadablePaths(config.spec, 'spec');
  await assertReadablePaths(config.code, 'code');

  return {
    repo: config.repo,
    spec: config.spec,
    code: config.code,
    baseline: config.baseline,
  };
}

async function assertRepoPath(repoPath: string): Promise<void> {
  await assertReadablePath(repoPath, 'repo');

  const repoStat = await stat(repoPath);

  if (!repoStat.isDirectory()) {
    throw new DriftGuardError(`repo path is not a directory: ${repoPath}`, ExitCode.ExecutionError);
  }
}

async function assertReadablePaths(paths: string[], label: 'spec' | 'code'): Promise<void> {
  for (const path of paths) {
    await assertReadablePath(path, label);
  }
}

async function assertReadablePath(path: string, label: 'repo' | 'spec' | 'code' | 'config file'): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new DriftGuardError(`${label} path does not exist: ${path}`, ExitCode.ExecutionError);
    }

    const message = error instanceof Error ? error.message : 'Unknown access failure';
    throw new DriftGuardError(
      `${label} path is unreadable: ${path} (${message})`,
      ExitCode.ExecutionError,
    );
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
