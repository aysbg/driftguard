import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { simpleGit } from 'simple-git';

import { DriftGuardError, ExitCode } from '../../../src/errors.js';
import { getChangedFiles, getStagedFiles } from '../../../src/git/changed-files.js';

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
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-git-'));
  tempPaths.push(repo);
  const git = simpleGit(repo);
  // Configure git user for commits (required by simple-git)
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test User');
  writeFileSync(resolve(repo, 'initial.txt'), 'initial', 'utf8');
  await git.add(['.']);
  await git.commit('Initial commit', ['--no-gpg-sign']);
  return repo;
}

describe('getChangedFiles', () => {
  it('returns changed files between base ref and HEAD', async () => {
    const repo = await createGitRepo();
    const git = simpleGit(repo);

    // Create and commit fileA
    writeFileSync(resolve(repo, 'fileA.txt'), 'v1', 'utf8');
    await git.add(['.']);
    await git.commit('Add fileA', ['--no-gpg-sign']);

    // Change fileA and add fileB in second commit
    writeFileSync(resolve(repo, 'fileA.txt'), 'v2', 'utf8');
    writeFileSync(resolve(repo, 'fileB.txt'), 'b', 'utf8');
    await git.add(['.']);
    await git.commit('Change fileA, add fileB', ['--no-gpg-sign']);

    const changed = await getChangedFiles(repo, 'HEAD~1');
    expect(changed).toContain('fileA.txt');
    expect(changed).toContain('fileB.txt');
    expect(changed).toEqual(changed.slice().sort());
  });

  it('throws DriftGuardError for non-git directory', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'driftguard-nogit-'));
    tempPaths.push(dir);

    const error = await getChangedFiles(dir, 'HEAD~1').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({ exitCode: ExitCode.ExecutionError });
    expect((error as Error).message.toLowerCase()).toContain('git repository');
  });

  it('throws DriftGuardError for invalid base ref', async () => {
    const repo = await createGitRepo();

    const error = await getChangedFiles(repo, 'nonexistent-branch').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({ exitCode: ExitCode.ExecutionError });
    expect((error as Error).message.toLowerCase()).toContain('invalid git base ref');
  });
});

describe('getStagedFiles', () => {
  it('returns staged files', async () => {
    const repo = await createGitRepo();
    const git = simpleGit(repo);

    writeFileSync(resolve(repo, 'staged.txt'), 'content', 'utf8');
    await git.add(['.']);

    const staged = await getStagedFiles(repo);
    expect(staged).toContain('staged.txt');
  });

  it('throws DriftGuardError for non-git directory', async () => {
    const dir = mkdtempSync(resolve(tmpdir(), 'driftguard-nogit-'));
    tempPaths.push(dir);

    const error = await getStagedFiles(dir).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(DriftGuardError);
    expect(error).toMatchObject({ exitCode: ExitCode.ExecutionError });
    expect((error as Error).message.toLowerCase()).toContain('git repository');
  });
});
