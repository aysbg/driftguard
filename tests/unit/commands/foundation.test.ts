import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFoundationCommand } from '../../../src/commands/foundation.js';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  listProjects: vi.fn(),
  loadFoundationMapping: vi.fn(),
  saveFoundationMapping: vi.fn(),
  clearFoundationMapping: vi.fn(),
}));

vi.mock('../../../src/foundation/mcp-client.js', () => {
  return {
    FoundationMcpClientImpl: vi.fn().mockImplementation(() => ({
      connect: mocks.connect,
      disconnect: mocks.disconnect,
      listProjects: mocks.listProjects,
    })),
  };
});

vi.mock('../../../src/foundation/project-store.js', () => {
  return {
    loadFoundationMapping: mocks.loadFoundationMapping,
    saveFoundationMapping: mocks.saveFoundationMapping,
    clearFoundationMapping: mocks.clearFoundationMapping,
  };
});

describe('executeFoundationCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connect.mockResolvedValue(undefined);
    mocks.disconnect.mockResolvedValue(undefined);
    mocks.listProjects.mockResolvedValue([
      { id: 'p1', name: 'Project One', slug: 'one' },
    ]);
    mocks.loadFoundationMapping.mockResolvedValue(null);
    mocks.saveFoundationMapping.mockResolvedValue(undefined);
    mocks.clearFoundationMapping.mockResolvedValue(undefined);
  });

  describe('auth', () => {
    it('returns 2 when no token', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('auth', {}, log);
      expect(code).toBe(2);
      expect(log.stderr).toHaveBeenCalledWith(
        expect.stringContaining('No token provided'),
      );
    });

    it('returns 0 when token is provided and mock client connects', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('auth', { token: 'tok123' }, log);
      expect(code).toBe(0);
      expect(mocks.connect).toHaveBeenCalledWith('tok123', undefined);
      expect(log.stdout).toHaveBeenCalledWith('Token configured');
    });
  });

  describe('projects', () => {
    it('returns 0 and lists projects', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('projects', { token: 'tok123' }, log);
      expect(code).toBe(0);
      expect(mocks.listProjects).toHaveBeenCalled();
      expect(log.stdout).toHaveBeenCalledWith(expect.stringContaining('p1'));
    });
  });

  describe('select', () => {
    it('returns 2 when no projectId', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('select', {}, log);
      expect(code).toBe(2);
      expect(log.stderr).toHaveBeenCalledWith(
        expect.stringContaining('No project ID'),
      );
    });

    it('returns 0 when projectId is saved', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('select', { projectId: 'proj-42' }, log);
      expect(code).toBe(0);
      expect(mocks.saveFoundationMapping).toHaveBeenCalledWith('.', 'proj-42', 'proj-42');
      expect(log.stdout).toHaveBeenCalledWith(
        'Project proj-42 selected for this repository',
      );
    });
  });

  describe('clear', () => {
    it('returns 0', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('clear', {}, log);
      expect(code).toBe(0);
      expect(mocks.clearFoundationMapping).toHaveBeenCalledWith('.');
      expect(log.stdout).toHaveBeenCalledWith('Project mapping cleared');
    });
  });

  describe('unknown subcommand', () => {
    it('returns 2', async () => {
      const log = { stdout: vi.fn(), stderr: vi.fn() };
      const code = await executeFoundationCommand('unknown', {}, log);
      expect(code).toBe(2);
      expect(log.stderr).toHaveBeenCalledWith(
        expect.stringContaining('Unknown foundation subcommand'),
      );
    });
  });
});
