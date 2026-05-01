import type { ScanResult } from '../types/scan.js';

/** Reporter-specific summary - minimal shape without widening ScanResult. */
export interface ReporterSummary {
  totalFindings: number;
  totalWarnings: number;
  enrichedFindings: number;
  status: 'ok' | 'drift_found' | 'error';
}

export interface JsonReportOutput {
  status: 'ok' | 'drift_found' | 'error';
  totalFindings: number;
  findings: ScanResult['findings'];
  warnings: ScanResult['warnings'];
  config: ScanResult['config'];
  summary: ReporterSummary;
}

/**
 * Renders a ScanResult as a stable JSON report object.
 * Object keys are constructed in deterministic order.
 */
export function buildJsonReport(result: ScanResult): JsonReportOutput {
  const { status, totalFindings, findings, warnings, config } = result;

  // Sort findings deterministically by id for stable output
  const sortedFindings = [...findings].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  // Sort warnings deterministically by filePath then message
  const sortedWarnings = [...warnings].sort((a, b) =>
    a.filePath.localeCompare(b.filePath) || a.message.localeCompare(b.message),
  );

  const enrichedFindings = sortedFindings.filter(
    (f) => f.specCitations || f.codeEvidence || f.explanation,
  ).length;

  return {
    status,
    totalFindings,
    findings: sortedFindings,
    warnings: sortedWarnings,
    config,
    summary: {
      totalFindings,
      totalWarnings: warnings.length,
      enrichedFindings,
      status,
    },
  };
}

/**
 * Renders a ScanResult as a JSON string.
 */
export function renderJsonReport(result: ScanResult): string {
  return JSON.stringify(buildJsonReport(result), null, 2);
}
