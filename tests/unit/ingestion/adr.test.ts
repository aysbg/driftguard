import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractAdrDocuments, detectAdrDocuments } from '../../../src/ingestion/adr.js';
import { ingestSpecs } from '../../../src/ingestion/spec-ingestor.js';

describe('adr ingestion adapter', () => {
  const tempRepos: string[] = [];

  afterEach(() => {
    for (const repo of tempRepos) {
      rmSync(repo, { recursive: true, force: true });
    }
    tempRepos.length = 0;
  });

  it('detects ADR files by path pattern', () => {
    const content = '# Title\n\n## Context\nText\n';
    expect(detectAdrDocuments('docs/adr-001-decision.md', content)).toBe(true);
  });

  it('detects ADR files by frontmatter status field', () => {
    const content = ['---', 'status: accepted', '---', '', '# Not ADR by name'].join('\n');
    expect(detectAdrDocuments('docs/decision.md', content)).toBe(true);
  });

  it('extracts frontmatter and markdown sections', () => {
    const filePath = 'docs/adr-001-use-structured-logging.md';
    const content = readFileSync(resolve('tests/fixtures/adr-example/docs/adr-001-use-structured-logging.md'), 'utf8');

    const documents = extractAdrDocuments(filePath, content);

    expect(documents).toHaveLength(1);
    expect(documents[0]?.frontmatter).toEqual({
      status: 'proposed',
      date: '2024-01-15',
      decision: 'Use structured logging',
    });
    expect(documents[0]?.operations).toEqual([]);
    expect(documents[0]?.sections[0]).toEqual({
      filePath,
      heading: 'ADR-001: Use Structured Logging',
      slug: 'adr-001-use-structured-logging',
      startLine: 2,
      endLine: 3,
      text: '',
    });
    expect(documents[0]?.sections[1]).toEqual({
      filePath,
      heading: 'Context',
      slug: 'context',
      startLine: 4,
      endLine: 11,
      text: 'The system currently uses unstructured text logs which makes querying and analysis difficult. We need a consistent logging format that supports:\n\n- Log aggregation tools (ELK, Splunk)\n- Structured query capabilities\n- Performance monitoring',
    });
  });

  it('extracts sections when frontmatter is absent', () => {
    const filePath = 'docs/adr-002-no-frontmatter.md';
    const content = ['# ADR-002: Decision', '', '## Decision', '', 'Use option A.'].join('\n');

    const documents = extractAdrDocuments(filePath, content);

    expect(documents).toEqual([
      {
        filePath,
        frontmatter: undefined,
        operations: [],
        sections: [
          {
            filePath,
            heading: 'ADR-002: Decision',
            slug: 'adr-002-decision',
            startLine: 1,
            endLine: 2,
            text: '',
          },
          {
            filePath,
            heading: 'Decision',
            slug: 'decision',
            startLine: 3,
            endLine: 5,
            text: 'Use option A.',
          },
        ],
      },
    ]);
  });

  it('returns parse warning for malformed frontmatter without crashing', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'driftguard-adr-'));
    tempRepos.push(repo);
    mkdirSync(resolve(repo, 'docs'), { recursive: true });
    writeFileSync(resolve(repo, 'docs/adr-003-malformed.md'), '---\nstatus: [\n---\n\n# ADR\n', 'utf8');

    const result = await ingestSpecs({
      repo,
      spec: ['docs'],
    });

    expect(result.documents).toEqual([]);
    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.filePath).toBe('docs/adr-003-malformed.md');
  });

  it('keeps non-ADR markdown on markdown adapter path', async () => {
    const result = await ingestSpecs({
      repo: resolve('tests/fixtures/no-drift'),
      spec: ['docs/requirements.md'],
    });

    expect(result.parseWarnings).toEqual([]);
    expect(result.documents).toHaveLength(1);
    expect('frontmatter' in result.documents[0]!).toBe(false);
    expect(result.documents[0]?.filePath).toBe('docs/requirements.md');
    expect(result.documents[0]?.sections).toHaveLength(3);
  });
});
