import { stat } from 'node:fs/promises';
import { extname, relative, sep } from 'node:path';
import fg from 'fast-glob';
import { Project } from 'ts-morph';
import type { ScanInput } from '../types/config.js';
import type { ParseWarning } from '../types/spec.js';
import type { RepositoryIndex } from '../types/repository.js';
import { indexRoutesInSourceFile } from './routes.js';

const SUPPORTED_CODE_FILE_EXTENSIONS = new Set(['.cts', '.js', '.jsx', '.mts', '.ts', '.tsx']);
const SUPPORTED_CODE_GLOBS = ['**/*.cts', '**/*.js', '**/*.jsx', '**/*.mts', '**/*.ts', '**/*.tsx'];

export interface RepositoryIndexResult {
  index: RepositoryIndex;
  warnings: ParseWarning[];
}

export async function indexRepository(input: Pick<ScanInput, 'repo' | 'code'> & { changedFiles?: string[] }): Promise<RepositoryIndexResult> {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const codeFiles = await discoverCodeFiles(input.code, input.repo, input.changedFiles);

  return {
    index: {
      files: codeFiles.map((filePath) => {
        const sourceFile = project.addSourceFileAtPath(filePath);

        return {
          filePath: toRelativeFilePath(input.repo, filePath),
          routes: indexRoutesInSourceFile(sourceFile, input.repo)
        };
      })
    },
    warnings: []
  };
}

async function discoverCodeFiles(codePaths: string[], repo: string, changedFiles?: string[]): Promise<string[]> {
  const filePaths = new Set<string>();
  const changedSet = changedFiles ? new Set(changedFiles) : undefined;

  for (const codePath of codePaths) {
    const stats = await stat(codePath);

    if (stats.isFile()) {
      if (SUPPORTED_CODE_FILE_EXTENSIONS.has(extname(codePath))) {
        addFile(filePaths, codePath, repo, changedSet);
      }

      continue;
    }

    const matches = await fg(SUPPORTED_CODE_GLOBS, {
      absolute: true,
      cwd: codePath,
      onlyFiles: true,
      unique: true
    });

    for (const match of matches) {
      addFile(filePaths, match, repo, changedSet);
    }
  }

  return [...filePaths].sort((left, right) => left.localeCompare(right));
}

function addFile(filePaths: Set<string>, path: string, repo: string, changedSet?: Set<string>): void {
  if (changedSet) {
    const rel = toRelativeFilePath(repo, path);
    if (!changedSet.has(rel)) return;
  }
  filePaths.add(path);
}

function toRelativeFilePath(repoRoot: string, filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join('/');
}
