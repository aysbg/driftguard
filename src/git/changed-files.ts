import { simpleGit } from 'simple-git';
import { DriftGuardError, ExitCode } from '../errors.js';

export async function getChangedFiles(repoPath: string, baseRef: string): Promise<string[]> {
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
    }
  } catch (error) {
    if (error instanceof DriftGuardError) throw error;
    throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
  }

  try {
    const summary = await (baseRef ? git.diff(['--name-only', baseRef, 'HEAD']) : git.diff(['--name-only']));
    return normalizePaths(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown git error';
    if (message.toLowerCase().includes('bad revision') || message.toLowerCase().includes('ambiguous argument')) {
      throw new DriftGuardError(
        `invalid git base ref: ${baseRef}`,
        ExitCode.ExecutionError,
      );
    }
    throw new DriftGuardError(
      `failed to get changed files: ${message}`,
      ExitCode.ExecutionError,
    );
  }
}

export async function getStagedFiles(repoPath: string): Promise<string[]> {
  const git = simpleGit(repoPath);

  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
    }
  } catch (error) {
    if (error instanceof DriftGuardError) throw error;
    throw new DriftGuardError(`${repoPath} is not a git repository`, ExitCode.ExecutionError);
  }

  try {
    const summary = await git.diff(['--cached', '--name-only']);
    return normalizePaths(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown git error';
    throw new DriftGuardError(
      `failed to get staged files: ${message}`,
      ExitCode.ExecutionError,
    );
  }
}

function normalizePaths(output: string): string[] {
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .sort((a, b) => a.localeCompare(b));
}
