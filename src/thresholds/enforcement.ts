import type { DriftFinding } from '../types/finding.js';
import type { FindingSeverity } from '../types/config.js';

const SEVERITY_ORDER: Record<FindingSeverity, number> = { high: 3, medium: 2, low: 1 };

export interface EnforcementResult {
  shouldFail: boolean;
  failingFindings: DriftFinding[];
}

/**
 * Evaluate whether findings should cause a failure based on a severity threshold set.
 * If failOn is undefined/empty, any finding causes a fail (existing behavior).
 * If failOn is provided, fail if any finding's severity is equal to or worse than
 * the lowest severity in the failOn set (cascading semantics).
 */
export function evaluateEnforcement(
  findings: DriftFinding[],
  failOn: FindingSeverity[] | undefined,
): EnforcementResult {
  if (!failOn || failOn.length === 0) {
    return {
      shouldFail: findings.length > 0,
      failingFindings: findings.slice(),
    };
  }

  const minThreshold = Math.min(...failOn.map((s) => SEVERITY_ORDER[s]));
  const failingFindings = findings.filter((f) => SEVERITY_ORDER[f.severity] >= minThreshold);

  return {
    shouldFail: failingFindings.length > 0,
    failingFindings,
  };
}
