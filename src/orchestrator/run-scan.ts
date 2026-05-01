import { basename } from 'node:path';
import { DriftGuardError, ExitCode } from '../errors.js';
import type { ScanResult } from '../types/scan.js';
import type { ScanInput } from '../types/config.js';
import type { UnifiedSpecIR } from '../types/spec.js';
import type { RepositoryIndexResult } from '../repository/indexer.js';
import type { RuleEngineResult } from '../rules/engine.js';
import type { SectionMapping } from '../types/finding.js';

export async function runScan(input: ScanInput): Promise<ScanResult> {
  const { ingestSpecs } = await import('../ingestion/spec-ingestor.js');
  const { indexRepository } = await import('../repository/indexer.js');
  const { mapOpenApiOperationsToRoutes } = await import('../mapping/mapper.js');
  const { mapSectionsToCode } = await import('../mapping/section-mapper.js');
  const { runRuleEngine } = await import('../rules/engine.js');

  const spec: UnifiedSpecIR = await ingestSpecs({ repo: input.repo, spec: input.spec });
  const repositoryResult: RepositoryIndexResult = await indexRepository({ repo: input.repo, code: input.code, changedFiles: input.changedFiles });

  const usableDocs = spec.documents.filter((d) => d.operations.length > 0 || d.sections.length > 0);
  if (usableDocs.length === 0) {
    throw new DriftGuardError('No usable spec documents found.', ExitCode.ExecutionError);
  }

  const mappingResult = mapOpenApiOperationsToRoutes(spec, repositoryResult.index);
  const adrSections = spec.documents.flatMap((document) => {
    const hasFrontmatter = 'frontmatter' in document && document.frontmatter !== undefined;
    const isAdrPath = basename(document.filePath).toLowerCase().startsWith('adr-');

    if (hasFrontmatter || isAdrPath) {
      return document.sections;
    }

    return [];
  });
  const sectionMappings: SectionMapping[] = mapSectionsToCode(adrSections, repositoryResult.index);
  const engine: RuleEngineResult = runRuleEngine({
    spec,
    repository: repositoryResult,
    mappingResult,
    sectionMappings: sectionMappings.length > 0 ? sectionMappings : undefined,
  });
  const status = engine.findings.length > 0 ? 'drift_found' : 'ok';

  return {
    status,
    totalFindings: engine.findings.length,
    findings: [...engine.findings].sort((a, b) => a.id.localeCompare(b.id)),
    warnings: [...engine.warnings].sort(
      (a, b) => a.filePath.localeCompare(b.filePath) || a.message.localeCompare(b.message),
    ),
    config: input,
  };
}
