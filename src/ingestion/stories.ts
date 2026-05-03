import type { Story } from '../types/spec.js';

interface HeadingMatch {
  heading: string;
  line: number;
}

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const storyHeadingPattern = /(\bstory\b|\bUS-[A-Z0-9_-]+)/i;
const storyIdPrefixPattern = /^(US-[A-Z0-9_-]+)/i;
const storyIdWordPattern = /^(Story\s+[A-Z0-9_-]+)/i;
const dependencyLinePattern = /(?:depends\s+on|dependencies)\s*:\s*(.+)$/i;

export function extractStories(filePath: string, content: string): Story[] {
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

  const stories: Story[] = [];

  headings.forEach((heading, index) => {
      if (!storyHeadingPattern.test(heading.heading)) {
        return;
      }

      const nextHeadingLine = headings[index + 1]?.line ?? lines.length + 1;
      const startLine = heading.line;
      const endLine = nextHeadingLine - 1;
      const sectionBody = trimBlankLines(lines.slice(startLine, endLine).join('\n'));

      stories.push({
        id: extractStoryId(heading.heading),
        title: heading.heading,
        description: sectionBody.slice(0, 200),
        dependencies: extractDependencies(sectionBody),
        filePath,
        startLine,
        endLine,
      } satisfies Story);
    });

  return stories.sort((left, right) => (left.startLine ?? 0) - (right.startLine ?? 0));
}

function extractStoryId(heading: string): string {
  const prefixedId = heading.match(storyIdPrefixPattern)?.[1];
  if (prefixedId) {
    return prefixedId;
  }

  const storyWordId = heading.match(storyIdWordPattern)?.[1];
  if (storyWordId) {
    return storyWordId;
  }

  return toSlug(heading);
}

function extractDependencies(sectionBody: string): string[] {
  const dependencies = new Set<string>();

  sectionBody.split(/\r?\n/).forEach((line) => {
    const match = line.match(dependencyLinePattern);
    if (!match) {
      return;
    }

    match[1]
      .split(',')
      .map((dependency) => dependency.trim())
      .filter((dependency) => dependency.length > 0)
      .forEach((dependency) => dependencies.add(dependency));
  });

  return Array.from(dependencies);
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
