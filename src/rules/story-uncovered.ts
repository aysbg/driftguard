import type { DriftFinding } from '../types/finding.js';
import type { Story } from '../types/spec.js';
import {
  exactMatchConfidence,
  storyUncoveredId,
  storyUncoveredSeverity,
} from '../rules/finding-conventions.js';

export function evaluateStoryUncovered(
  stories: Story[],
  existingFindings: DriftFinding[],
): DriftFinding[] {
  const findings = stories.flatMap((story) => {
    const uncoveredDependencies = story.dependencies.filter((dependencyId) =>
      existingFindings.some((finding) =>
        finding.id.toLowerCase().includes(dependencyId.toLowerCase()),
      ),
    );

    if (uncoveredDependencies.length === 0) {
      return [];
    }

    const uncoveredList = uncoveredDependencies.join(', ');

    return [
      {
        id: storyUncoveredId(story.id, story.filePath),
        summary: `Story '${story.title}' depends on uncovered entities: ${uncoveredList}`,
        severity: storyUncoveredSeverity,
        confidence: exactMatchConfidence,
        mappingConfidence: 'medium',
        affectedFiles: [story.filePath],
        specReferences: [story.filePath],
        explanation: {
          expected: 'all dependencies implemented in code',
          found: `${uncoveredList} are uncovered`,
          reason: 'Story dependencies are not fully implemented',
        },
      } satisfies DriftFinding,
    ];
  });

  return findings.sort((left, right) => left.id.localeCompare(right.id));
}
