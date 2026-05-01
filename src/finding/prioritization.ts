import type { DriftFinding } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';

export interface PrioritizationContext {
  repositoryIndex?: RepositoryIndex;
}

function isMissingApiRoute(finding: DriftFinding): boolean {
  return finding.id.startsWith('openapi-route-exists:');
}

export function assignSeverity(finding: DriftFinding, _context: PrioritizationContext): DriftFinding {
  const factors: string[] = [];

  if (isMissingApiRoute(finding)) {
    factors.push('Missing API route — breaks contract');
  }

  if (finding.confidence === 'high') {
    factors.push('High confidence mapping');
  } else if (finding.confidence === 'low') {
    factors.push('Low confidence mapping reduces severity');
  }

  if (finding.affectedFiles.length >= 4) {
    factors.push('Broad blast radius');
  } else if (finding.affectedFiles.length === 1) {
    factors.push('Limited blast radius');
  }

  return {
    ...finding,
    severityRationale: {
      factors,
      score: factors.length,
    },
  };
}

const severityOrder: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function sortBySeverity(findings: DriftFinding[]): DriftFinding[] {
  return [...findings].sort((left, right) => {
    const severityDiff = (severityOrder[right.severity] ?? 0) - (severityOrder[left.severity] ?? 0);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return left.id.localeCompare(right.id);
  });
}
