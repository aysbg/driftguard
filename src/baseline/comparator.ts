import type { DriftFinding } from '../types/finding.js';
import type { BaselineFile, BaselineComparisonResult } from '../types/baseline.js';

const SEVERITY_ORDER: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const BLAST_ORDER: Record<string, number> = {
  unknown: 0,
  limited: 1,
  moderate: 2,
  broad: 3,
};

export function compareFindings(
  current: DriftFinding[],
  baseline: BaselineFile,
): BaselineComparisonResult[] {
  const results: BaselineComparisonResult[] = [];

  const currentById = new Map(current.map((f) => [f.id, f]));
  const baselineById = new Map(baseline.findings.map((f) => [f.id, f]));

  for (const finding of current) {
    const previousFinding = baselineById.get(finding.id);
    if (!previousFinding) {
      results.push({ status: 'new', finding });
      continue;
    }

    const severityWorsened =
      SEVERITY_ORDER[finding.severity] > SEVERITY_ORDER[previousFinding.severity];
    const blastWorsened =
      BLAST_ORDER[finding.blastRadius?.level ?? 'unknown'] >
      BLAST_ORDER[previousFinding.blastRadius?.level ?? 'unknown'];

    if (severityWorsened || blastWorsened) {
      results.push({ status: 'worsened', finding, previousFinding });
    } else {
      results.push({ status: 'persisted', finding, previousFinding });
    }
  }

  for (const previousFinding of baseline.findings) {
    if (!currentById.has(previousFinding.id)) {
      const finding = current.find((f) => f.id === previousFinding.id) ?? previousFinding;
      results.push({ status: 'resolved', finding, previousFinding });
    }
  }

  return results;
}
