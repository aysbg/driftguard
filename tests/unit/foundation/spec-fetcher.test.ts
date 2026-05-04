import { describe, it, expect, vi } from 'vitest';
import { fetchFoundationSpecs, detectSpecFormat } from '../../../src/foundation/spec-fetcher.js';
import type { FoundationMcpClient } from '../../../src/foundation/client-interface.js';
import type { FoundationProject, FoundationSpec } from '../../../src/foundation/types.js';

function createMockClient(specs: FoundationSpec[]): FoundationMcpClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listProjects: vi.fn().mockResolvedValue([
      { id: 'test-project', name: 'Test Project', slug: 'test' },
    ] satisfies FoundationProject[]),
    fetchMenu: vi.fn().mockResolvedValue(['epics', 'project_specifics']),
    fetchSpecs: vi.fn().mockResolvedValue(specs),
    postDeviationReport: vi.fn().mockResolvedValue(undefined),
  };
}

describe('detectSpecFormat', () => {
  it('returns openapi for openapi format strings', () => {
    expect(detectSpecFormat('openapi')).toBe('openapi');
    expect(detectSpecFormat('openapi_v3')).toBe('openapi');
    expect(detectSpecFormat('swagger')).toBe('openapi');
    expect(detectSpecFormat('OpenAPI')).toBe('openapi');
  });

  it('returns markdown for markdown format strings', () => {
    expect(detectSpecFormat('markdown')).toBe('markdown');
    expect(detectSpecFormat('md')).toBe('markdown');
    expect(detectSpecFormat('Markdown')).toBe('markdown');
  });

  it('returns unknown for unrecognized formats', () => {
    expect(detectSpecFormat('pdf')).toBe('unknown');
    expect(detectSpecFormat('')).toBe('unknown');
  });
});

describe('fetchFoundationSpecs', () => {
  it('calls listProjects then fetchSpecs and returns unified IR', async () => {
    const specs: FoundationSpec[] = [
      {
        id: 'spec-1',
        content: `paths:\n  /users:\n    get:\n      summary: List users`,
        format: 'openapi',
        version: '1.0',
      },
    ];
    const client = createMockClient(specs);
    const result = await fetchFoundationSpecs(client, 'proj-1');

    expect(client.listProjects).toHaveBeenCalled();
    expect(client.fetchMenu).toHaveBeenCalled();
    expect(client.fetchSpecs).toHaveBeenCalledWith('proj-1', 'epics,project_specifics');
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.source).toBe('foundation');
    expect(result.documents[0]?.operations.length).toBeGreaterThan(0);
    expect(result.parseWarnings).toEqual([]);
  });

  it('returns empty IR with warning when no specs returned', async () => {
    const client = createMockClient([]);
    const result = await fetchFoundationSpecs(client, 'proj-empty');

    expect(client.listProjects).toHaveBeenCalled();
    expect(client.fetchMenu).toHaveBeenCalled();
    expect(client.fetchSpecs).toHaveBeenCalledWith('proj-empty', 'epics,project_specifics');
    expect(result.documents).toEqual([]);
    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.message).toContain('no specs');
  });

  it('skips unrecognized formats with a parse warning', async () => {
    const specs: FoundationSpec[] = [
      {
        id: 'spec-1',
        content: 'content',
        format: 'pdf',
        version: '1.0',
      },
    ];
    const client = createMockClient(specs);
    const result = await fetchFoundationSpecs(client, 'proj-1');

    expect(result.documents).toEqual([]);
    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.message).toContain('Unrecognized');
    expect(result.parseWarnings[0]?.filePath).toBe('foundation://proj-1/spec-1');
  });

  it('processes markdown specs into sections', async () => {
    const specs: FoundationSpec[] = [
      {
        id: 'spec-1',
        content: '# Hello\n\nSome text here.',
        format: 'md',
        version: '1.0',
      },
    ];
    const client = createMockClient(specs);
    const result = await fetchFoundationSpecs(client, 'proj-1');

    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.source).toBe('foundation');
    expect(result.documents[0]?.sections.length).toBeGreaterThan(0);
    expect(result.documents[0]?.operations).toEqual([]);
  });

  it('adds a parse warning on extraction error', async () => {
    const specs: FoundationSpec[] = [
      {
        id: 'spec-1',
        content: '{{bad',
        format: 'openapi',
        version: '1.0',
      },
    ];
    const client = createMockClient(specs);
    const result = await fetchFoundationSpecs(client, 'proj-1');

    expect(result.documents).toEqual([]);
    expect(result.parseWarnings.length).toBeGreaterThan(0);
  });

  it('returns warning and skips fetch when menu is empty', async () => {
    const client = createMockClient([]);
    vi.mocked(client.fetchMenu).mockResolvedValueOnce([]);

    const result = await fetchFoundationSpecs(client, 'proj-empty-menu');

    expect(client.listProjects).toHaveBeenCalled();
    expect(client.fetchMenu).toHaveBeenCalled();
    expect(client.fetchSpecs).not.toHaveBeenCalled();
    expect(result.documents).toEqual([]);
    expect(result.parseWarnings).toHaveLength(1);
    expect(result.parseWarnings[0]?.message).toContain('no spec sections');
  });

  it('propagates error when fetchMenu fails', async () => {
    const client = createMockClient([]);
    vi.mocked(client.fetchMenu).mockRejectedValueOnce(new Error('Menu unavailable'));

    await expect(fetchFoundationSpecs(client, 'proj-fail')).rejects.toThrow('Menu unavailable');
  });
});
