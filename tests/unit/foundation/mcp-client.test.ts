import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FoundationMcpClientImpl } from '../../../src/foundation/mcp-client.js';
import { DriftGuardError } from '../../../src/errors.js';

const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockTransportClose = vi.fn();
const mockStdioConstructor = vi.fn();

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  return {
    Client: vi.fn().mockImplementation(() => {
      return {
        connect: mockConnect,
        close: mockClose,
        listTools: mockListTools,
        callTool: mockCallTool,
        listPrompts: vi.fn(),
        listResources: vi.fn(),
        readResource: vi.fn(),
      };
    }),
  };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  return {
    StdioClientTransport: vi.fn().mockImplementation((params) => {
      mockStdioConstructor(params);
      return {
        close: mockTransportClose,
        pid: 12345,
        onclose: undefined as (() => void) | undefined,
        onerror: undefined as ((error: Error) => void) | undefined,
      };
    }),
  };
});

describe('FoundationMcpClientImpl', () => {
  let client: FoundationMcpClientImpl;

  beforeEach(() => {
    client = new FoundationMcpClientImpl();
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('spawns the process and succeeds when foundation tools are present', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({
        tools: [
          { name: 'foundation_search' },
          { name: 'foundation_fetch' },
        ],
      });

      await client.connect('test-token', 'https://api.example.com');
      expect(mockStdioConstructor).toHaveBeenCalled();
      const transportParams = mockStdioConstructor.mock.calls[0][0];
      expect(transportParams.command).toBe('foundationworks-mcp');
      expect(transportParams.env.FOUNDATION_TOKEN).toBe('test-token');
      expect(transportParams.env.FOUNDATION_API_URL).toBe('https://api.example.com');
      expect(mockConnect).toHaveBeenCalled();
      expect(mockListTools).toHaveBeenCalled();
    });

    it('throws DriftGuardError with connection message when server exits without tools', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'other_tool' }] });

      await expect(client.connect('bad-token')).rejects.toThrow(
        DriftGuardError,
      );
      await expect(client.connect('bad-token')).rejects.toThrow(
        /Foundation MCP server connection failed/,
      );
    });

    it('throws DriftGuardError with auth message on auth-like failure', async () => {
      mockConnect.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(client.connect('bad-token')).rejects.toThrow(
        DriftGuardError,
      );
      await expect(client.connect('bad-token')).rejects.toThrow(
        /Foundation authentication failed/,
      );
    });

    it(
      'times out if connection exceeds 10s',
      async () => {
        mockConnect.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 12000)),
        );

        await expect(client.connect('test-token')).rejects.toThrow(
          /Foundation MCP server connection failed/,
        );
      },
      15000,
    );

    it('redacts token in error messages', async () => {
      mockConnect.mockRejectedValue(new Error('boom my-secret-token123'));

      try {
        await client.connect('my-secret-token123');
      } catch (error) {
        expect(error).toBeInstanceOf(DriftGuardError);
        const msg = (error as Error).message;
        expect(msg).not.toContain('my-secret-token123');
        expect(msg).toContain('[REDACTED]');
      }
    });
  });

  describe('disconnect', () => {
    it('closes client and transport and kills the subprocess', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_menu' }] });

      await client.connect('test-token');
      await client.disconnect();

      expect(mockClose).toHaveBeenCalled();
      expect(mockTransportClose).toHaveBeenCalled();
    });
  });

  describe('listProjects', () => {
    it('calls foundation_search and returns parsed projects', async () => {
      const projects = [
        { id: 'proj-1', name: 'Alpha', slug: 'alpha' },
        { id: 'proj-2', name: 'Beta', slug: 'beta' },
      ];

      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_search' }] });
      mockCallTool.mockResolvedValue({
        structuredContent: projects,
      });

      await client.connect('test-token');
      const result = await client.listProjects();
      expect(result).toEqual(projects);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'foundation_search',
        arguments: {},
      });
    });

    it('parses text content JSON when structuredContent is absent', async () => {
      const projects = [{ id: 'p', name: 'Project', slug: 'project' }];

      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_search' }] });
      mockCallTool.mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify(projects) }],
      });

      await client.connect('test-token');
      const result = await client.listProjects();
      expect(result).toEqual(projects);
    });

    it('throws DriftGuardError when not connected', async () => {
      await expect(client.listProjects()).rejects.toThrow(
        /Foundation MCP server connection failed/,
      );
    });
  });

  describe('fetchSpecs', () => {
    it('calls foundation_fetch with provided sections and returns parsed specs', async () => {
      const specs = [
        { id: 's-1', content: 'hi', format: 'openapi', version: '1.0' },
      ];

      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_fetch' }] });
      mockCallTool.mockResolvedValue({
        structuredContent: specs,
      });

      await client.connect('test-token');
      const result = await client.fetchSpecs('proj-1', 'epics,project_specifics');
      expect(result).toEqual(specs);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'foundation_fetch',
        arguments: {
          projectId: 'proj-1',
          sections: 'epics,project_specifics',
        },
      });
    });

    it('calls foundation_fetch without sections when not provided', async () => {
      const specs = [
        { id: 's-1', content: 'hi', format: 'openapi', version: '1.0' },
      ];

      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_fetch' }] });
      mockCallTool.mockResolvedValue({
        structuredContent: specs,
      });

      await client.connect('test-token');
      const result = await client.fetchSpecs('proj-1');
      expect(result).toEqual(specs);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'foundation_fetch',
        arguments: {
          projectId: 'proj-1',
        },
      });
    });
  });

  describe('fetchMenu', () => {
    it('calls foundation_menu and returns parsed string array', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_menu' }] });
      mockCallTool.mockResolvedValue({
        structuredContent: ['epics', 'project_specifics', 'background'],
      });

      await client.connect('test-token');
      const result = await client.fetchMenu();
      expect(result).toEqual(['epics', 'project_specifics', 'background']);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'foundation_menu',
        arguments: {},
      });
    });

    it('throws DriftGuardError when not connected', async () => {
      await expect(client.fetchMenu()).rejects.toThrow(
        /Foundation MCP server connection failed/,
      );
    });

    it('throws DriftGuardError when MCP call fails', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_menu' }] });
      mockCallTool.mockRejectedValue(new Error('transport closed'));

      await client.connect('test-token');
      await expect(client.fetchMenu()).rejects.toThrow(
        /Foundation tool error/,
      );
    });
  });

  describe('postDeviationReport', () => {
    it('calls foundation_comment with projectId and reports', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_comment' }] });
      mockCallTool.mockResolvedValue({});

      await client.connect('test-token');
      const reports = [
        {
          findingId: 'f-1',
          severity: 'high',
          message: 'mismatch',
          filePath: 'src/api.ts',
        },
      ];
 await client.postDeviationReport('proj-1', reports);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'foundation_comment',
        arguments: {
          projectId: 'proj-1',
          reports,
        },
      });
    });

    it('throws DriftGuardError when server crashes', async () => {
      mockConnect.mockResolvedValue(undefined);
      mockListTools.mockResolvedValue({ tools: [{ name: 'foundation_comment' }] });
      mockCallTool.mockImplementation(() => {
        throw new Error('broken pipe');
      });

      await client.connect('test-token');
      await expect(
        client.postDeviationReport('proj-1', []),
      ).rejects.toThrow(/Foundation tool error/);
    });
  });
});
