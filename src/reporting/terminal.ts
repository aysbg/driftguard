import type { ScanResult } from '../types/scan.js';
import type { DriftFinding } from '../types/finding.js';

function severityLabel(severity: string): string {
  return severity;
}

function confidenceLabel(confidence: string): string {
  return confidence;
}

/**
 * Renders a ScanResult as a human-readable terminal report.
 */
export function renderTerminalReport(result: ScanResult): string {
  const lines: string[] = [];
  const { status, totalFindings, findings, warnings } = result;

  lines.push(`Status: ${status}`);
  lines.push('');

  if (status === 'ok') {
    lines.push('No drift found');
  } else {
    lines.push('Drift found');
    lines.push('');
    for (const finding of findings) {
      appendFindingLines(lines, finding);
    }
  }

  lines.push('');
  lines.push(`Total findings: ${totalFindings}`);
  lines.push(`Warnings: ${warnings.length}`);

  return lines.join('\n');
}

function appendFindingLines(lines: string[], finding: DriftFinding): void {
  if (finding.method && finding.path) {
    lines.push(`  ${finding.method} ${finding.path}`);
  } else if (finding.path) {
    lines.push(`  ${finding.path}`);
  }

  if (finding.explanation) {
    const { expected, found, reason } = finding.explanation;
    if (expected) lines.push(`  Expected: ${expected}`);
    if (found) lines.push(`  Found: ${found}`);
    if (reason) lines.push(`  Reason: ${reason}`);
  }

  for (const file of finding.affectedFiles) {
    lines.push(`  Affected: ${file}`);
  }

  for (const citation of finding.specCitations ?? []) {
    const location = citation.startLine
      ? citation.endLine
        ? `${citation.filePath} line ${citation.startLine}-${citation.endLine}`
        : `${citation.filePath} line ${citation.startLine}`
      : citation.filePath;
    lines.push(`  Referenced in: ${location}`);
  }

  for (const evidence of finding.codeEvidence ?? []) {
    const location = evidence.startLine
      ? `${evidence.filePath}:${evidence.startLine}`
      : evidence.filePath;
    lines.push(`  Affected code: ${location}`);
  }

  for (const ref of finding.specReferences) {
    lines.push(`  Spec: ${ref}`);
  }

  lines.push(`  Severity: ${severityLabel(finding.severity)}`);
  lines.push(`  Confidence: ${confidenceLabel(finding.confidence)}`);
  lines.push('');
}