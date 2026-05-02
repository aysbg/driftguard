import type { FoundationMcpClient } from './client-interface.js';
import type {
  FoundationDeviationReport,
  FoundationProject,
  FoundationSpec,
} from './types.js';

export class MockFoundationMcpClient implements FoundationMcpClient {
  async connect(_token: string, _apiUrl?: string): Promise<void> {
    // no-op for mock
  }

  async disconnect(): Promise<void> {
    // no-op for mock
  }

  async listProjects(): Promise<FoundationProject[]> {
    return [{ id: 'test-project', name: 'Test Project', slug: 'test' }];
  }

  async fetchSpecs(_projectId: string): Promise<FoundationSpec[]> {
    return [
      { id: 'spec-1', content: 'mock content', format: 'openapi', version: '1.0' },
    ];
  }

  async postDeviationReport(
    _projectId: string,
    _reports: FoundationDeviationReport[],
  ): Promise<void> {
    // no-op for mock
  }
}
