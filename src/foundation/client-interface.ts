import type {
  FoundationDeviationReport,
  FoundationProject,
  FoundationSpec,
} from './types.js';

export interface FoundationMcpClient {
  connect(token: string, apiUrl?: string): Promise<void>;
  disconnect(): Promise<void>;
  fetchMenu(): Promise<string[]>;
  listProjects(): Promise<FoundationProject[]>;
  fetchSpecs(projectId: string, sections?: string): Promise<FoundationSpec[]>;
  postDeviationReport(
    projectId: string,
    reports: FoundationDeviationReport[],
  ): Promise<void>;
}
