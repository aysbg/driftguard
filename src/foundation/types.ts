export interface FoundationProject {
  id: string;
  name: string;
  slug: string;
}

export interface FoundationSpec {
  id: string;
  content: string;
  format: string;
  version: string;
}

export interface FoundationDeviationReport {
  findingId: string;
  severity: string;
  message: string;
  filePath: string;
}

export interface FoundationMcpError {
  code: string;
  message: string;
}
