import { mkdtempSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { simpleGit } from 'simple-git';

import { DriftGuardError, ExitCode } from '../errors.js';

export interface Snapshot {
  path: string;
  ref: string;
}

export async function createSnapshot(repoPath: string, ref: string): Promise<Snapshot> {
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

  let resolvedRef: string;
  try {
    resolvedRef = (await git.revparse([ref])).trim();
  } catch {
    throw new DriftGuardError(`invalid git ref: ${ref}`, ExitCode.ExecutionError);
  }

  const tempDir = mkdtempSync(join(tmpdir(), `driftguard-snap-${sanitizeRef(ref)}-${Date.now()}-`));

  try {
    const treeOutput = await git.raw(['ls-tree', '-r', '--name-only', resolvedRef]);
    const files = treeOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const filePath of files) {
      const destination = resolve(tempDir, filePath);
      await mkdir(dirname(destination), { recursive: true });

      let content: string;
      try {
        content = await git.raw(['show', `${resolvedRef}:${filePath}`]);
      } catch {
        throw new DriftGuardError(
          `failed to read file at ref ${ref}: ${filePath}`,
          ExitCode.ExecutionError,
        );
      }

      await writeFile(destination, content, 'utf8');
    }

    return { path: tempDir, ref };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    if (error instanceof DriftGuardError) throw error;
    const message = error instanceof Error ? error.message : 'unknown git error';
    throw new DriftGuardError(`failed to create snapshot: ${message}`, ExitCode.ExecutionError);
  }
}

export async function cleanupSnapshot(snapshot: Snapshot): Promise<void> {
  await rm(snapshot.path, { recursive: true, force: true });
}

function sanitizeRef(ref: string): string {
  return ref.replace(/[^a-zA-Z0-9._-]/g, '_');
}
