import type { SpecSection } from '../types/spec.js';

interface HeadingMatch {
  heading: string;
  line: number;
}

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

export function extractMarkdownSections(filePath: string, content: string): SpecSection[] {
  const lines = content.split(/\r?\n/);
  const headings: HeadingMatch[] = [];

  lines.forEach((line, index) => {
    const match = line.match(headingPattern);

    if (!match) {
      return;
    }

    headings.push({
      heading: match[2].trim(),
      line: index + 1,
    });
  });

  return headings.map((heading, index) => {
    const nextHeadingLine = headings[index + 1]?.line ?? lines.length + 1;
    const startLine = heading.line;
    const endLine = nextHeadingLine - 1;
    const text = trimBlankLines(lines.slice(startLine, endLine).join('\n'));

    return {
      filePath,
      heading: heading.heading,
      slug: toSlug(heading.heading),
      startLine,
      endLine,
      text,
    } satisfies SpecSection;
  });
}

function trimBlankLines(value: string): string {
  return value.replace(/^\s*\n/u, '').replace(/\n\s*$/u, '').trimEnd();
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
