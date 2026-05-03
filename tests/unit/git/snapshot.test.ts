import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { simpleGit } from 'simple-git';

import { DriftGuardError, ExitCode } from '../../../src/errors.js';
import { cleanupSnapshot, createSnapshot } from '../../../src/git/snapshot.js';

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  }
});

async function createGitRepo(): Promise<string> {
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-snapshot-repo-'));
  tempPaths.push(repo);
  const git = simpleGit(repo);
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test User');
  return repo;
}

describe('createSnapshot', () => {
  it('creates a snapshot for HEAD with matching file contents', async () => {
    const repo = await createGitRepo();
    const git = simpleGit(repo);
    mkdirSync(resolve(repo, 'nested'), { recursive: true });
    writeFileSync(resolve(repo, 'a.txt'), 'alpha\n', 'utf8');
    writeFileSync(resolve(repo, 'nested/b.txt'), 'beta\n', 'utf8');
    await git.add(['.']);
    await git.commit('Add files', ['--no-gpg-sign']);

    const snapshot = await createSnapshot(repo, 'HEAD');
    tempPaths.push(snapshot.path);

    const aStat = await stat(resolve(snapshot.path, 'a.txt'));
    const bStat = await stat(resolve(snapshot.path, 'nested/b.txt'));

    expect(aStat.isFile()).toBe(true);
    expect(bStat.isFile()).toBe(true);
    expect(readFileSync(resolve(snapshot.path, 'a.txt'), 'utf8')).toBe('alpha\n');
    expect(readFileSync(resolve(snapshot.path, 'nested/b.txt'), 'utf8')).toBe('beta\n');
  });

  it('throws DriftGuardError for invalid ref', async () => {
    const repo = await createGitRepo();
    const git = simpleGit(repo);
    writeFileSync(resolve(repo, 'initial.txt'), 'initial\n', 'utf8');
    await git.add(['.']);
    await git.commit('Initial commit', ['--no-gpg-sign']);

    const error = await createSnapshot(repo, 'does-not-exist').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({ exitCode: ExitCode.ExecutionError });
    expect((error as Error).message.toLowerCase()).toContain('invalid git ref');
  });
});

describe('cleanupSnapshot', () => {
  it('removes snapshot directory', async () => {
    const repo = await createGitRepo();
    const git = simpleGit(repo);
    writeFileSync(resolve(repo, 'initial.txt'), 'initial\n', 'utf8');
    await git.add(['.']);
    await git.commit('Initial commit', ['--no-gpg-sign']);

    const snapshot = await createSnapshot(repo, 'HEAD');

    try {
      await access(snapshot.path);
      await cleanupSnapshot(snapshot);
      const missing = await access(snapshot.path).then(() => false).catch(() => true);
      expect(missing).toBe(true);
    } finally {
      tempPaths.push(snapshot.path);
    }
  });
});
