import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractMarkdownSections } from '../../../src/ingestion/markdown.js';

describe('extractMarkdownSections', () => {
  it('extracts heading metadata from requirements markdown', () => {
    const filePath = 'docs/requirements.md';
    const content = readFileSync(resolve('tests/fixtures/no-drift/docs/requirements.md'), 'utf8');

    const sections = extractMarkdownSections(filePath, content);

    expect(sections).toEqual([
      {
        filePath: 'docs/requirements.md',
        heading: 'User Management',
        slug: 'user-management',
        startLine: 1,
        endLine: 2,
        text: '',
      },
      {
        filePath: 'docs/requirements.md',
        heading: 'User Lookup',
        slug: 'user-lookup',
        startLine: 3,
        endLine: 6,
        text: 'The system must support retrieving individual users by their unique identifier.',
      },
      {
        filePath: 'docs/requirements.md',
        heading: 'Requirements',
        slug: 'requirements',
        startLine: 7,
        endLine: 12,
        text: '- Users can be looked up by ID\n- Lookup returns user details including name and contact information\n- Lookup operations complete within acceptable latency thresholds',
      },
    ]);
  });
});
