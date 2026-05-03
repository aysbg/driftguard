import { describe, expect, it } from 'vitest';

import { extractStories } from '../../../src/ingestion/stories.js';

describe('extractStories', () => {
  it('extracts story sections and dependencies from markdown headings', () => {
    const filePath = 'docs/stories.md';
    const content = [
      '# Introduction',
      '',
      '## US-001: Process Order',
      'User can place an order.',
      'Depends on: BR-001, POST /users',
      '',
      '### Story 2: Cancel Order',
      'User can cancel an order.',
      'Depends on: data-model-exists:Order',
    ].join('\n');

    expect(extractStories(filePath, content)).toEqual([
      {
        id: 'US-001',
        title: 'US-001: Process Order',
        description: 'User can place an order.\nDepends on: BR-001, POST /users',
        dependencies: ['BR-001', 'POST /users'],
        filePath,
        startLine: 3,
        endLine: 6,
      },
      {
        id: 'Story 2',
        title: 'Story 2: Cancel Order',
        description: 'User can cancel an order.\nDepends on: data-model-exists:Order',
        dependencies: ['data-model-exists:Order'],
        filePath,
        startLine: 7,
        endLine: 9,
      },
    ]);
  });
});
