import { basename, extname } from 'node:path';

import { tokenize, toPathTokens } from './mapper.js';
import type { MappingConfidence, SectionMapping } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';
import type { SpecSection } from '../types/spec.js';

export type { SectionMapping } from '../types/finding.js';

const DEFAULT_EXCLUDED_SECTIONS = ['introduction', 'background', 'references', 'overview', 'table of contents'];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function mapSectionsToCode(
  sections: SpecSection[],
  repositoryIndex: RepositoryIndex,
  excludedSections: string[] = DEFAULT_EXCLUDED_SECTIONS
): SectionMapping[] {
  const excluded = new Set(excludedSections.map((section) => section.toLowerCase()));

  return [...sections]
    .sort(compareSections)
    .filter((section) => !excluded.has(section.heading.toLowerCase()) && !excluded.has(section.slug.toLowerCase()))
    .map((section) => mapSection(section, repositoryIndex));
}

function mapSection(section: SpecSection, repositoryIndex: RepositoryIndex): SectionMapping {
  const tokens = extractSectionTokens(section);
  const headingSlugTokens = new Set([...tokenize(section.heading), ...tokenize(section.slug)]);
  const scoredFiles = repositoryIndex.files
    .map((file) => {
      const fileTokens = new Set(tokenize(file.filePath));
      const filenameStem = tokenize(basename(file.filePath, extname(file.filePath)));
      const overlap = tokens.reduce((score, token) => score + (fileTokens.has(token) ? 1 : 0), 0);
      const slugMatchesFilenameStem = filenameStem.some((token) => headingSlugTokens.has(token));
      const score = overlap + (slugMatchesFilenameStem ? 1 : 0);

      return {
        filePath: file.filePath,
        overlap,
        slugMatchesFilenameStem,
        score,
      };
    })
    .filter((file) => file.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  if (scoredFiles.length === 0) {
    return {
      section,
      matchedFiles: [],
      confidence: 'low',
    };
  }

  const bestScore = scoredFiles[0]?.score ?? 0;
  const matchedFiles = scoredFiles.filter((file) => file.score === bestScore).map((file) => file.filePath).sort();
  const confidence: MappingConfidence = scoredFiles.some(
    (file) => file.score === bestScore && (file.overlap >= 2 || file.slugMatchesFilenameStem)
  )
    ? 'medium'
    : 'low';

  return {
    section,
    matchedFiles,
    confidence,
  };
}

function extractSectionTokens(section: SpecSection): string[] {
  return [
    ...tokenize(section.heading),
    ...tokenize(section.slug),
    ...extractRoutePatternTokens(section.text),
    ...extractCodeReferenceTokens(section.text),
  ];
}

function extractRoutePatternTokens(text: string): string[] {
  const tokens: string[] = [];
  const routePattern = /(?:\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+)?\/[A-Za-z0-9_/:{}.-]+/g;

  for (const match of text.matchAll(routePattern)) {
    const route = HTTP_METHODS.reduce((value, method) => value.replace(new RegExp(`^${method}\\s+`, 'i'), ''), match[0]);
    tokens.push(...toPathTokens(route.replace(/:([A-Za-z0-9_]+)/g, '{$1}')));
  }

  return tokens;
}

function extractCodeReferenceTokens(text: string): string[] {
  const tokens: string[] = [];
  const codeReferencePattern = /\b[A-Za-z0-9_-]+\.(?:ts|tsx|js|jsx|mts|cts)\b|\b[A-Za-z_][A-Za-z0-9_]*(?:Handler|Controller|Route|Router)\b/g;

  for (const match of text.matchAll(codeReferencePattern)) {
    tokens.push(...tokenize(match[0]));
  }

  return tokens;
}

function compareSections(left: SpecSection, right: SpecSection): number {
  return left.filePath.localeCompare(right.filePath) || left.startLine - right.startLine;
}
