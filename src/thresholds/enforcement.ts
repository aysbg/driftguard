import type { DriftFinding } from '../types/finding.js';
import type { FindingSeverity } from '../types/config.js';

const SEVERITY_ORDER: Record<FindingSeverity, number> = { high: 3, medium: 2, low: 1 };

export interface EnforcementOptions {
  failOn?: FindingSeverity[];
  newOnly?: boolean;
  maxFindings?: number;
  maxNewFindings?: number;
}

export interface EnforcementResult {
  shouldFail: boolean;
  failingFindings: DriftFinding[];
  newFindingsCount: number;
  persistedCount: number;
  resolvedCount: number;
  reason?: string;
}

/**
 * Evaluate whether findings should cause a failure based on severity thresholds,
 * new-only policies, and max-count limits.
 */
export function evaluateEnforcement(
  findings: DriftFinding[],
  options: EnforcementOptions = {},
): EnforcementResult {
  const { failOn, newOnly, maxFindings, maxNewFindings } = options;

  const newFindings = findings.filter((f) => f.baselineStatus === 'new');
  const persistedFindings = findings.filter((f) => f.baselineStatus === 'persisted' || f.baselineStatus === 'worsened');
  const resolvedFindings = findings.filter((f) => f.baselineStatus === 'resolved');

  let candidates = findings;

  if (newOnly) {
    candidates = newFindings;
  }

  if (maxFindings !== undefined && findings.length > maxFindings) {
    return {
      shouldFail: true,
      failingFindings: candidates,
      newFindingsCount: newFindings.length,
      persistedCount: persistedFindings.length,
      resolvedCount: resolvedFindings.length,
      reason: `Total findings (${findings.length}) exceeds maxFindings (${maxFindings})`,
    };
  }

  if (maxNewFindings !== undefined && newFindings.length > maxNewFindings) {
    return {
      shouldFail: true,
      failingFindings: candidates,
      newFindingsCount: newFindings.length,
      persistedCount: persistedFindings.length,
      resolvedCount: resolvedFindings.length,
      reason: `New findings (${newFindings.length}) exceeds maxNewFindings (${maxNewFindings})`,
    };
  }

  if (!failOn || failOn.length === 0) {
    return {
      shouldFail: candidates.length > 0,
      failingFindings: candidates,
      newFindingsCount: newFindings.length,
      persistedCount: persistedFindings.length,
      resolvedCount: resolvedFindings.length,
    };
  }

  const minThreshold = Math.min(...failOn.map((s) => SEVERITY_ORDER[s]));
  const failingFindings = candidates.filter((f) => SEVERITY_ORDER[f.severity] >= minThreshold);

  return {
    shouldFail: failingFindings.length > 0,
    failingFindings,
    newFindingsCount: newFindings.length,
    persistedCount: persistedFindings.length,
    resolvedCount: resolvedFindings.length,
  };
}
