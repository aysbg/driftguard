import type { BusinessRule } from '../types/spec.js';

interface HeadingMatch {
  heading: string;
  line: number;
}

const headingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const explicitRuleIdPattern = /^(BR-[A-Z0-9_-]+|RULE-[A-Z0-9_-]+)/i;
const semanticRuleHeadingPattern = /\b(business\s+rule|rule|constraint)\b/i;

export function extractBusinessRules(filePath: string, content: string): BusinessRule[] {
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

  return headings
    .map((heading, index) => {
      if (!isBusinessRuleHeading(heading.heading)) {
        return undefined;
      }

      const nextHeadingLine = headings[index + 1]?.line ?? lines.length + 1;
      const startLine = heading.line;
      const endLine = nextHeadingLine - 1;
      const sectionBody = trimBlankLines(lines.slice(startLine, endLine).join('\n'));
      const description = sectionBody.slice(0, 200);
      const explicitId = extractExplicitRuleId(heading.heading);

      return {
        id: explicitId ?? toSlug(heading.heading),
        title: heading.heading,
        description,
        filePath,
        startLine,
        endLine,
      } satisfies BusinessRule;
    })
    .filter((rule): rule is BusinessRule => Boolean(rule))
    .sort((left, right) => left.startLine - right.startLine);
}

function isBusinessRuleHeading(heading: string): boolean {
  return explicitRuleIdPattern.test(heading) || semanticRuleHeadingPattern.test(heading);
}

function extractExplicitRuleId(heading: string): string | undefined {
  const match = heading.match(explicitRuleIdPattern);
  return match?.[1];
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
