import { describe, expect, it } from 'vitest';

import { mapSectionsToCode } from '../../../src/mapping/section-mapper.js';
import type { RepositoryIndex } from '../../../src/types/repository.js';
import type { SpecSection } from '../../../src/types/spec.js';

const repositoryIndex: RepositoryIndex = {
  files: [
    {
      filePath: 'src/routes/orders.ts',
      routes: [
        {
          method: 'GET',
          path: '/orders/{id}',
          filePath: 'src/routes/orders.ts',
          line: 6,
          snippet: "router.get('/orders/:id', handler)",
        },
      ],
    },
    {
      filePath: 'src/routes/users.ts',
      routes: [
        {
          method: 'GET',
          path: '/users/{id}',
          filePath: 'src/routes/users.ts',
          line: 5,
          snippet: "router.get('/users/:id', handler)",
        },
      ],
    },
  ],
};

function section(overrides: Partial<SpecSection>): SpecSection {
  return {
    filePath: 'docs/requirements.md',
    heading: 'User Management',
    slug: 'user-management',
    startLine: 1,
    endLine: 10,
    text: 'The API supports GET /users and GET /users/{id}.',
    ...overrides,
  };
}

describe('mapSectionsToCode', () => {
  it('maps a section mentioning /users to users route file with medium confidence', () => {
    expect(mapSectionsToCode([section({})], repositoryIndex)).toEqual([
      {
        section: section({}),
        matchedFiles: ['src/routes/users.ts'],
        confidence: 'medium',
      },
    ]);
  });

  it('does not map an orders section to users route file', () => {
    const orderSection = section({
      heading: 'Order Management',
      slug: 'order-management',
      text: 'The API supports GET /orders and POST /orders.',
      startLine: 20,
    });

    expect(mapSectionsToCode([orderSection], repositoryIndex)).toEqual([
      {
        section: orderSection,
        matchedFiles: ['src/routes/orders.ts'],
        confidence: 'medium',
      },
    ]);
  });

  it('excludes boilerplate introduction sections by default case-insensitively', () => {
    const introduction = section({
      heading: 'Introduction',
      slug: 'introduction',
      text: 'Introductory notes that mention GET /users.',
    });

    expect(mapSectionsToCode([introduction], repositoryIndex)).toEqual([]);
  });

  it('returns low confidence with no matched files for sections with no significant tokens', () => {
    const genericSection = section({
      heading: 'Details',
      slug: 'details',
      text: 'This section describes behavior without code-specific references.',
    });

    expect(mapSectionsToCode([genericSection], repositoryIndex)).toEqual([
      {
        section: genericSection,
        matchedFiles: [],
        confidence: 'low',
      },
    ]);
  });

  it('returns mappings in deterministic order across repeated runs', () => {
    const sections = [
      section({ filePath: 'docs/b.md', startLine: 10, text: 'GET /orders' }),
      section({ filePath: 'docs/a.md', startLine: 20, text: 'GET /users' }),
      section({ filePath: 'docs/a.md', startLine: 5, text: 'GET /orders' }),
    ];

    const first = mapSectionsToCode(sections, repositoryIndex);
    const second = mapSectionsToCode([...sections].reverse(), repositoryIndex);

    expect(first).toEqual(second);
    expect(first.map((mapping) => [mapping.section.filePath, mapping.section.startLine])).toEqual([
      ['docs/a.md', 5],
      ['docs/a.md', 20],
      ['docs/b.md', 10],
    ]);
  });
});
