import type {
  FoundationDeviationReport,
  FoundationProject,
  FoundationSpec,
} from './types.js';

export interface FoundationMcpClient {
  connect(token: string, apiUrl?: string): Promise<void>;
  disconnect(): Promise<void>;
  listProjects(): Promise<FoundationProject[]>;
  fetchSpecs(projectId: string): Promise<FoundationSpec[]>;
  postDeviationReport(
    projectId: string,
    reports: FoundationDeviationReport[],
  ): Promise<void>;
}
