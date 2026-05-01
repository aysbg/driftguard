import type { DriftFinding, SectionMapping } from '../types/finding.js';

export function evaluateSectionUnmapped(mappings: SectionMapping[]): DriftFinding[] {
  return mappings
    .filter((mapping) => mapping.matchedFiles.length === 0)
    .map(
      (mapping) =>
        ({
          id: `markdown-section-unmapped:${mapping.section.slug}|${mapping.section.filePath}`,
          summary: `Spec section '${mapping.section.heading}' has no confident mapping to implementation`,
          severity: 'low',
          confidence: mapping.confidence,
          mappingConfidence: mapping.confidence,
          affectedFiles: [],
          specReferences: [mapping.section.filePath],
          specCitations: [
            {
              filePath: mapping.section.filePath,
              sectionOrOperation: mapping.section.heading,
              startLine: mapping.section.startLine,
              endLine: mapping.section.endLine,
            },
          ],
          codeEvidence: [],
          explanation: {
            expected: `Implementation areas should exist for section '${mapping.section.heading}'`,
            found: 'No code files confidently match this section',
            reason: 'The documented section may represent unimplemented intent or require explicit config mapping',
          },
        }) satisfies DriftFinding
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}
