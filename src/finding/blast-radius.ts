import type { DriftFinding, BlastRadius, BlastRadiusLevel, ImpactedArtifact } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';

export function computeBlastRadius(
  finding: DriftFinding,
  _repoIndex?: RepositoryIndex,
): BlastRadius {
  const isADRType =
    !finding.method &&
    !finding.path &&
    (!finding.codeEvidence || finding.codeEvidence.length === 0);

  if (isADRType && finding.affectedFiles.length === 0) {
    return { level: 'unknown', impactedArtifacts: [] };
  }

  const impactedArtifacts: ImpactedArtifact[] = [];

  for (const filePath of finding.affectedFiles) {
    impactedArtifacts.push({ type: 'file', name: filePath });
  }

  if (finding.method && finding.path) {
    impactedArtifacts.push({
      type: 'endpoint',
      name: `${finding.method} ${finding.path}`,
    });
  }

  let level: BlastRadiusLevel;
  const fileCount = finding.affectedFiles.length;

  if (fileCount === 0) {
    level = 'unknown';
  } else if (fileCount === 1) {
    level = 'limited';
  } else if (fileCount >= 2 && fileCount <= 3) {
    level = 'moderate';
  } else {
    level = 'broad';
  }

  return { level, impactedArtifacts };
}
