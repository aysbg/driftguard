import { basename } from 'node:path';
import { DriftGuardError, ExitCode } from '../errors.js';
import type { ScanResult } from '../types/scan.js';
import type { ScanInput } from '../types/config.js';
import type { UnifiedSpecIR } from '../types/spec.js';
import type { RepositoryIndexResult } from '../repository/indexer.js';
import type { RuleEngineResult } from '../rules/engine.js';
import type { SectionMapping } from '../types/finding.js';
import { loadPlugins, executePlugins } from '../rules/plugin-loader.js';

export async function runScan(input: ScanInput): Promise<ScanResult> {
  const { indexRepository } = await import('../repository/indexer.js');
  const { mapOpenApiOperationsToRoutes } = await import('../mapping/mapper.js');
  const { mapSectionsToCode } = await import('../mapping/section-mapper.js');
  const { runRuleEngine } = await import('../rules/engine.js');

  const spec: UnifiedSpecIR = await resolveSpec(input);
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

  let findings = engine.findings;
  let warnings = [...engine.warnings];

  if (input.plugins && input.plugins.length > 0) {
    const { plugins, warnings: pluginWarnings } = await loadPlugins(input.plugins);
    warnings.push(...pluginWarnings);

    const pluginFindings = await executePlugins(plugins, {
      spec,
      repository: repositoryResult.index,
      mappings: engine.mappings,
    });

    findings = [...findings, ...pluginFindings];
  }

  findings = findings.sort((a, b) => a.id.localeCompare(b.id));
  warnings = warnings.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.message.localeCompare(b.message));

  const status = findings.length > 0 ? 'drift_found' : 'ok';

  return {
    status,
    totalFindings: findings.length,
    findings,
    warnings,
    config: input,
  };
}

async function resolveSpec(input: ScanInput): Promise<UnifiedSpecIR> {
  if (input.foundationConfig?.enabled === true) {
    const { resolveFoundationToken } = await import('../foundation/auth.js');
    const token = resolveFoundationToken({
      token: input.foundationConfig.authToken,
    });
    if (!token) {
      throw new DriftGuardError(
        'Foundation is enabled but no auth token is available. Set --foundation-token or DRIFTGUARD_FOUNDATION_TOKEN.',
        ExitCode.ExecutionError,
      );
    }

    const { FoundationMcpClientImpl } = await import('../foundation/mcp-client.js');
    const { fetchFoundationSpecs } = await import('../foundation/spec-fetcher.js');
    const client = new FoundationMcpClientImpl();
    await client.connect(token, input.foundationConfig.apiUrl);
    try {
      return await fetchFoundationSpecs(client, input.foundationConfig.projectId ?? '');
    } finally {
      await client.disconnect();
    }
  }

  const { ingestSpecs } = await import('../ingestion/spec-ingestor.js');
  return ingestSpecs({ repo: input.repo, spec: input.spec });
}
