import { relative, sep } from 'node:path';
import type { SourceFile } from 'ts-morph';
import type { IndexedModel } from '../types/repository.js';

export function indexModelsInSourceFile(sourceFile: SourceFile, repoRoot: string): IndexedModel[] {
  const filePath = toRelativeFilePath(repoRoot, sourceFile.getFilePath());
  const interfaces = sourceFile.getInterfaces().map((declaration) => ({
    name: declaration.getName(),
    kind: 'interface' as const,
    filePath,
    line: declaration.getStartLineNumber(),
    snippet: declaration.getText()
  }));
  const typeAliases = sourceFile.getTypeAliases().map((declaration) => ({
    name: declaration.getName(),
    kind: 'type_alias' as const,
    filePath,
    line: declaration.getStartLineNumber(),
    snippet: declaration.getText()
  }));

  return [...interfaces, ...typeAliases].sort((left, right) => left.name.localeCompare(right.name) || left.line - right.line);
}

function toRelativeFilePath(repoRoot: string, filePath: string): string {
  return relative(repoRoot, filePath).split(sep).join('/');
}
