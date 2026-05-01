import { basename } from 'node:path';
import matter from 'gray-matter';

import { extractMarkdownSections } from './markdown.js';
import type { AdrDocument, AdrFrontmatter } from '../types/spec.js';

const adrFilePattern = /^adr-.*\.md$/i;

export function detectAdrDocuments(filePath: string, content: string): boolean {
  if (adrFilePattern.test(basename(filePath))) {
    return true;
  }

  const parsed = matter(content);
  return typeof parsed.data.status === 'string' && parsed.data.status.trim().length > 0;
}

export function extractAdrDocuments(filePath: string, content: string): AdrDocument[] {
  const parsed = matter(content);
  const frontmatter = toAdrFrontmatter(parsed.data);

  return [
    {
      filePath,
      frontmatter,
      sections: extractMarkdownSections(filePath, parsed.content),
      operations: [],
    },
  ];
}

function toAdrFrontmatter(value: Record<string, unknown>): AdrFrontmatter | undefined {
  const status = toOptionalString(value.status);
  const date = toOptionalString(value.date);
  const decision = toOptionalString(value.decision);
  const supersededBy = toOptionalString(value.supersededBy);

  if (!status && !date && !decision && !supersededBy) {
    return undefined;
  }

  return {
    ...(status ? { status } : {}),
    ...(date ? { date } : {}),
    ...(decision ? { decision } : {}),
    ...(supersededBy ? { supersededBy } : {}),
  };
}

function toOptionalString(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return value;
}
