import { describe, expect, it } from 'vitest';

import { mapSectionsToCode } from '../../../src/mapping/section-mapper.js';
import { evaluateSectionUnmapped } from '../../../src/rules/markdown-section-unmapped.js';
import type { SectionMapping } from '../../../src/types/finding.js';
import type { RepositoryIndex } from '../../../src/types/repository.js';
import type { SpecSection } from '../../../src/types/spec.js';

describe('evaluateSectionUnmapped', () => {
  it('section with no file matches produces low-severity unmapped finding', () => {
    const mappings: SectionMapping[] = [
      {
        section: makeSection({ heading: 'User Onboarding', slug: 'user-onboarding' }),
        matchedFiles: [],
        confidence: 'low',
      },
    ];

    expect(evaluateSectionUnmapped(mappings)).toEqual([
      {
        id: 'markdown-section-unmapped:user-onboarding|docs/adr-001.md',
        summary: "Spec section 'User Onboarding' has no confident mapping to implementation",
        severity: 'low',
        confidence: 'low',
        mappingConfidence: 'low',
        affectedFiles: [],
        specReferences: ['docs/adr-001.md'],
        specCitations: [
          {
            filePath: 'docs/adr-001.md',
            sectionOrOperation: 'User Onboarding',
            startLine: 12,
            endLine: 20,
          },
        ],
        codeEvidence: [],
        explanation: {
          expected: "Implementation areas should exist for section 'User Onboarding'",
          found: 'No code files confidently match this section',
          reason: 'The documented section may represent unimplemented intent or require explicit config mapping',
        },
      },
    ]);
  });

  it('section with medium-confidence match does not produce a finding', () => {
    const mappings: SectionMapping[] = [
      {
        section: makeSection({ heading: 'User Onboarding', slug: 'user-onboarding' }),
        matchedFiles: ['src/routes/users.ts'],
        confidence: 'medium',
      },
    ];

    expect(evaluateSectionUnmapped(mappings)).toEqual([]);
  });

  it('boilerplate section excluded by section mapper is not flagged', () => {
    const sections: SpecSection[] = [
      makeSection({ heading: 'Introduction', slug: 'introduction' }),
      makeSection({
        heading: 'Billing Lifecycle',
        slug: 'billing-lifecycle',
        filePath: 'docs/adr-002.md',
      }),
    ];
    const repositoryIndex: RepositoryIndex = { files: [] };
    const mappings = mapSectionsToCode(sections, repositoryIndex);

    expect(evaluateSectionUnmapped(mappings)).toEqual([
      {
        id: 'markdown-section-unmapped:billing-lifecycle|docs/adr-002.md',
        summary: "Spec section 'Billing Lifecycle' has no confident mapping to implementation",
        severity: 'low',
        confidence: 'low',
        mappingConfidence: 'low',
        affectedFiles: [],
        specReferences: ['docs/adr-002.md'],
        specCitations: [
          {
            filePath: 'docs/adr-002.md',
            sectionOrOperation: 'Billing Lifecycle',
            startLine: 12,
            endLine: 20,
          },
        ],
        codeEvidence: [],
        explanation: {
          expected: "Implementation areas should exist for section 'Billing Lifecycle'",
          found: 'No code files confidently match this section',
          reason: 'The documented section may represent unimplemented intent or require explicit config mapping',
        },
      },
    ]);
  });

  it('finding id is deterministic and findings are sorted by id', () => {
    const mappings: SectionMapping[] = [
      {
        section: makeSection({ heading: 'Zeta', slug: 'zeta', filePath: 'docs/zeta.md' }),
        matchedFiles: [],
        confidence: 'low',
      },
      {
        section: makeSection({ heading: 'Alpha', slug: 'alpha', filePath: 'docs/alpha.md' }),
        matchedFiles: [],
        confidence: 'medium',
      },
    ];

    expect(evaluateSectionUnmapped(mappings).map((finding) => finding.id)).toEqual([
      'markdown-section-unmapped:alpha|docs/alpha.md',
      'markdown-section-unmapped:zeta|docs/zeta.md',
    ]);
  });
});

function makeSection(overrides: Partial<SpecSection> = {}): SpecSection {
  return {
    filePath: 'docs/adr-001.md',
    heading: 'Section Heading',
    slug: 'section-heading',
    startLine: 12,
    endLine: 20,
    text: 'Section body',
    ...overrides,
  };
}
