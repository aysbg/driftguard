import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';

import {
  saveFoundationMapping,
  loadFoundationMapping,
  clearFoundationMapping,
} from '../../../src/foundation/project-store.js';

const tempPaths: string[] = [];

afterEach(() => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  }
});

function createTempRepo(): string {
  const repo = mkdtempSync(resolve(tmpdir(), 'driftguard-project-store-'));
  tempPaths.push(repo);
  return repo;
}

describe('saveFoundationMapping + loadFoundationMapping', () => {
  it('roundtrips mapping correctly', async () => {
    const repo = createTempRepo();
    await saveFoundationMapping(repo, 'proj-123', 'My Project');

    const loaded = await loadFoundationMapping(repo);
    expect(loaded).not.toBeNull();
    expect(loaded?.projectId).toBe('proj-123');
    expect(loaded?.name).toBe('My Project');
    expect(loaded?.updatedAt).toBeTruthy();
  });
});

describe('loadFoundationMapping', () => {
  it('returns null when file is missing', async () => {
    const repo = createTempRepo();
    const loaded = await loadFoundationMapping(repo);
    expect(loaded).toBeNull();
  });

  it('returns null when JSON is invalid', async () => {
    const repo = createTempRepo();
    const dir = resolve(repo, '.driftguard');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, '.foundation-mapping.json'), 'not-json', 'utf8');

    const loaded = await loadFoundationMapping(repo);
    expect(loaded).toBeNull();
  });
});

describe('clearFoundationMapping', () => {
  it('overwrites with empty object so load returns null', async () => {
    const repo = createTempRepo();
    await saveFoundationMapping(repo, 'proj-123', 'My Project');
    expect(await loadFoundationMapping(repo)).not.toBeNull();

    await clearFoundationMapping(repo);
    const loaded = await loadFoundationMapping(repo);
    expect(loaded).toBeNull();
  });
});
