import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export interface FoundationMapping {
  projectId: string;
  name: string;
  updatedAt: string;
}

function mappingPath(repoPath: string): string {
  return resolve(repoPath, '.driftguard', '.foundation-mapping.json');
}

export async function loadFoundationMapping(repoPath: string): Promise<FoundationMapping | null> {
  try {
    const content = await readFile(mappingPath(repoPath), 'utf8');
    const parsed = JSON.parse(content) as FoundationMapping;
    if (typeof parsed.projectId === 'string' && typeof parsed.name === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveFoundationMapping(
  repoPath: string,
  projectId: string,
  name: string,
): Promise<void> {
  const dir = resolve(repoPath, '.driftguard');
  await mkdir(dir, { recursive: true });
  const mapping: FoundationMapping = {
    projectId,
    name,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(mappingPath(repoPath), JSON.stringify(mapping, null, 2), 'utf8');
}

export async function clearFoundationMapping(repoPath: string): Promise<void> {
  try {
    await writeFile(mappingPath(repoPath), '{}', 'utf8');
  } catch {
    // best-effort
  }
}
