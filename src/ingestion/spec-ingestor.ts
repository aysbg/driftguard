import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import fg from 'fast-glob';

import { detectAdrDocuments, extractAdrDocuments } from './adr.js';
import { extractBusinessRules } from './business-rules.js';
import { extractMarkdownSections } from './markdown.js';
import { extractDataModels, extractOpenApiOperations } from './openapi.js';
import type { ResolvedConfig } from '../types/config.js';
import type { ParseWarning, SpecDocument, UnifiedSpecIR } from '../types/spec.js';

const markdownExtensions = new Set(['.markdown', '.md']);
const openApiExtensions = new Set(['.json', '.yaml', '.yml']);

interface DiscoveredSpecFile {
  absolutePath: string;
  filePath: string;
}

export async function ingestSpecs(config: Pick<ResolvedConfig, 'repo' | 'spec'>): Promise<UnifiedSpecIR> {
  const specFiles = await discoverSpecFiles(config.repo, config.spec);
  const documents: SpecDocument[] = [];
  const parseWarnings: ParseWarning[] = [];

  for (const specFile of specFiles) {
    const { absolutePath, filePath } = specFile;

    try {
      const content = await readFile(absolutePath, 'utf8');
      const extension = extname(filePath).toLowerCase();

      if (markdownExtensions.has(extension)) {
        const businessRules = extractBusinessRules(filePath, content);

        if (detectAdrDocuments(filePath, content)) {
          const adrDocuments = extractAdrDocuments(filePath, content).map((document) => ({
            ...document,
            businessRules,
            dataModels: [],
            stories: [],
          }));

          documents.push(...adrDocuments);
          continue;
        }

        documents.push({
          filePath,
          sections: extractMarkdownSections(filePath, content),
          operations: [],
          businessRules,
          dataModels: [],
          stories: [],
        });
        continue;
      }

      if (openApiExtensions.has(extension)) {
        documents.push({
          filePath,
          sections: [],
          operations: extractOpenApiOperations(filePath, content),
          dataModels: extractDataModels(filePath, content),
          businessRules: [],
          stories: [],
        });
      }
    } catch (error) {
      parseWarnings.push({
        filePath,
        message: toErrorMessage(error),
      });
    }
  }

  return {
    documents,
    parseWarnings,
  };
}

async function discoverSpecFiles(repo: string, specPaths: string[]): Promise<DiscoveredSpecFile[]> {
  const files = new Map<string, string>();

  for (const specPath of specPaths) {
    const absolutePath = toAbsolutePath(repo, specPath);
    const stats = await stat(absolutePath);

    if (stats.isDirectory()) {
      const matches = await fg('**/*.{json,md,markdown,yaml,yml}', {
        cwd: absolutePath,
        onlyFiles: true,
        absolute: true,
      });

      for (const match of matches.sort((left, right) => left.localeCompare(right))) {
        files.set(toRepoRelativePath(repo, match), match);
      }

      continue;
    }

    if (stats.isFile() && isSupportedSpecExtension(specPath)) {
      files.set(toRepoRelativePath(repo, absolutePath), absolutePath);
    }
  }

  return Array.from(files.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, absolutePath]) => ({
      absolutePath,
      filePath,
    }));
}

function isSupportedSpecExtension(filePath: string): boolean {
  const extension = extname(filePath).toLowerCase();
  return markdownExtensions.has(extension) || openApiExtensions.has(extension);
}

function toRepoRelativePath(repo: string, absolutePath: string): string {
  return relative(repo, absolutePath).split(sep).join('/');
}

function toAbsolutePath(repo: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : resolve(repo, filePath);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
