import type { DriftFinding } from '../types/finding.js';
import type { ScanResult } from '../types/scan.js';
import type { FoundationMcpClient } from './client-interface.js';
import { DriftGuardError, ExitCode } from '../errors.js';

export interface DeviationWriteBackOptions {
  enabled: boolean;
  projectId: string;
}

export function shouldWriteBack(
  config: { writeBack?: boolean; enabled?: boolean; projectId?: string } | undefined,
): DeviationWriteBackOptions | null {
  if (config?.enabled === true && config.writeBack === true && config.projectId) {
    return { enabled: true, projectId: config.projectId };
  }
  return null;
}

export function findingsToDeviationReports(findings: DriftFinding[]): {
  findingId: string;
  severity: string;
  message: string;
  filePath: string;
}[] {
  return findings.map((f) => ({
    findingId: f.id,
    severity: f.severity,
    message: `${f.summary}${f.remediationHint ? ` — Hint: ${f.remediationHint}` : ''}`,
    filePath: f.affectedFiles[0] ?? 'unknown',
  }));
}

export async function writeBackDeviationReport(
  client: FoundationMcpClient,
  projectId: string,
  result: ScanResult,
): Promise<void> {
  if (result.totalFindings === 0) {
    return;
  }
  const reports = findingsToDeviationReports(result.findings);
  if (reports.length === 0) {
    return;
  }
  try {
    await client.postDeviationReport(projectId, reports);
  } catch (error) {
    if (error instanceof DriftGuardError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new DriftGuardError(
      `Write-back to Foundation failed: ${message}`,
      ExitCode.ExecutionError,
    );
  }
}
