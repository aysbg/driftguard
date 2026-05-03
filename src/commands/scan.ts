import { dirname } from 'node:path';
import { stat, writeFile } from 'node:fs/promises';
import { renderJsonReport } from '../reporting/json.js';
import { renderTerminalReport } from '../reporting/terminal.js';
import { renderSarifReport } from '../reporting/sarif.js';
import { resolveConfig, parseFailOn } from '../config/resolver.js';
import { preflightConfig } from '../config/preflight.js';
import { runHistoricalScan } from './historical-scan.js';
import { runScan } from '../orchestrator/run-scan.js';
import { evaluateEnforcement } from '../thresholds/enforcement.js';
import { getChangedFiles } from '../git/changed-files.js';
import { shouldWriteBack, writeBackDeviationReport } from '../foundation/deviation-reporter.js';
import { FoundationMcpClientImpl } from '../foundation/mcp-client.js';
import { resolveFoundationToken } from '../foundation/auth.js';
import { DriftGuardError, ExitCode } from '../errors.js';
import type { ScanResult } from '../types/scan.js';
import type { ScanCliOptions } from '../config/resolver.js';
import type { FindingSeverity } from '../types/config.js';

import { assignSeverity, sortBySeverity } from '../finding/prioritization.js';
import { computeBlastRadius } from '../finding/blast-radius.js';
import { loadBaseline } from '../baseline/manager.js';
import { compareFindings } from '../baseline/comparator.js';

export interface ScanCommandOptions extends ScanCliOptions {
  json?: boolean;
  ci?: boolean;
  failOn?: string[];
  changedOnly?: boolean;
  baseRef?: string;
  since?: string;
  sarif?: string;
  foundationProject?: string;
  foundationToken?: string;
  foundationUrl?: string;
  writeBack?: boolean;
  plugins?: string[];
}

export async function executeScan(
  options: ScanCommandOptions,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  try {
    const resolvedOptions = await resolveCliOptions(options);

    const config = await resolveConfig(resolvedOptions);
    const scanInput = await preflightConfig(config);
    const ciConfig = buildEffectiveCiConfig(config.ci, resolvedOptions);

    if (ciConfig?.changedOnly) {
      const baseRef = ciConfig.baseRef ?? 'HEAD~1';
      scanInput.changedFiles = await getChangedFiles(scanInput.repo, baseRef);
    }

    let result = scanInput.since
      ? (await runHistoricalScan(scanInput, scanInput.since)).result
      : await runScan(scanInput);

    // Epic 4: enrich findings with severity rationale and blast radius
    let findings = result.findings.map((f) => {
      const blastRadius = computeBlastRadius(f, undefined);
      return assignSeverity({ ...f, blastRadius }, {});
    });
    findings = sortBySeverity(findings);
    result = { ...result, findings };

    // Epic 4: baseline comparison
    if (scanInput.baseline) {
      try {
        const baseline = await loadBaseline(scanInput.repo, scanInput.baseline);
        const comparisonResults = compareFindings(findings, baseline);
        const statusMap = new Map(comparisonResults.map((r) => [r.finding.id, r.status]));
        findings = findings.map((f) => ({ ...f, baselineStatus: statusMap.get(f.id) }));
        result = {
          ...result,
          findings,
          baselineComparison: {
            baselineName: scanInput.baseline,
            findings: comparisonResults,
          },
        };
      } catch (error) {
        result = {
          ...result,
          comparisonUnavailable: error instanceof Error ? error.message : 'Baseline comparison failed',
        };
      }
    }

    const failOn = ciConfig?.failOn;
    const newOnly = config.ci?.thresholds?.failOnNewOnly;
    const maxFindings = config.ci?.thresholds?.maxFindings;
    const maxNewFindings = config.ci?.thresholds?.maxNewFindings;
    const findingsToEnforce = newOnly
      ? result.findings.filter((f) => f.baselineStatus === 'new')
      : result.findings;
    const { shouldFail } = evaluateEnforcement(findingsToEnforce, { failOn, newOnly, maxFindings, maxNewFindings });

    const effectiveResult: ScanResult = {
      ...result,
      status: shouldFail ? 'drift_found' : 'ok',
    };

    // Epic 5: write-back deviation report to Foundation
    const writeBackOpts = shouldWriteBack(config.foundation);
    if (writeBackOpts) {
      const token = resolveFoundationToken({ token: options.foundationToken });
      if (token) {
        let client: FoundationMcpClientImpl | null = null;
        try {
          client = new FoundationMcpClientImpl();
          await client.connect(token, config.foundation?.apiUrl);
          await writeBackDeviationReport(client, writeBackOpts.projectId, effectiveResult);
        } catch (wbError) {
          log.stderr(
            `[driftguard] Write-back warning: ${wbError instanceof Error ? wbError.message : String(wbError)}`,
          );
        } finally {
          await client?.disconnect();
        }
      } else {
        log.stderr('[driftguard] Write-back skipped: no Foundation token available');
      }
    }

    return await outputResult(effectiveResult, resolvedOptions.json, resolvedOptions.sarif, log);
  } catch (error) {
    if (options.sarif && error instanceof Error) {
      try {
        const sarif = renderSarifReport({
          status: 'error',
          totalFindings: 0,
          findings: [],
          warnings: [],
          config: { repo: options.repo ?? '.', spec: options.spec ?? [], code: options.code ?? [] },
        });
        await writeFile(options.sarif, JSON.stringify(sarif, null, 2));
      } catch {
        // best effort; don't mask original error
      }
    }
    return handleError(error, options.json, log);
  }
}

function buildEffectiveCiConfig(
  configCi: { failOn?: FindingSeverity[]; changedOnly?: boolean; baseRef?: string; sarif?: string } | undefined,
  options: ScanCommandOptions,
): { failOn?: FindingSeverity[]; changedOnly?: boolean; baseRef?: string; sarif?: string } | undefined {
  const ci = configCi ? { ...configCi } : {};

  if (options.ci !== undefined) {
    // CI mode active from CLI
  }

  if (options.failOn && options.failOn.length > 0) {
    ci.failOn = parseFailOn(options.failOn.join(','));
  }

  if (options.changedOnly !== undefined) {
    ci.changedOnly = options.changedOnly;
  }

  if (options.baseRef !== undefined) {
    ci.baseRef = options.baseRef;
  }

  if (options.sarif !== undefined) {
    ci.sarif = options.sarif;
  }

  if (Object.keys(ci).length === 0) {
    return undefined;
  }

  return ci;
}

async function resolveCliOptions(options: ScanCommandOptions): Promise<ScanCommandOptions> {
  if (options.failOn && options.failOn.length > 0 && !options.ci) {
    throw new DriftGuardError(
      '--fail-on requires --ci flag. Use --ci to enable CI mode.',
      ExitCode.ExecutionError,
    );
  }

  if (options.failOn && options.failOn.length > 0) {
    parseFailOn(options.failOn.join(','));
  }

  if (options.sarif) {
    try {
      const dir = dirname(options.sarif);
      const dirStat = await stat(dir);
      if (!dirStat.isDirectory()) {
        throw new DriftGuardError(
          `sarif output directory does not exist: ${dir}`,
          ExitCode.ExecutionError,
        );
      }
    } catch (error) {
      if (error instanceof DriftGuardError) throw error;
      if (error instanceof Error && 'code' in error) {
        throw new DriftGuardError(
          `sarif output path is not writable: ${options.sarif}`,
          ExitCode.ExecutionError,
        );
      }
      throw error;
    }
  }

  return options;
}

function handleError(
  error: unknown,
  json: boolean | undefined,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): number {
  if (json) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    log.stdout(
      JSON.stringify({
        status: 'error',
        totalFindings: 0,
        findings: [],
        warnings: [],
        error: errorMessage,
      }),
    );
    return ExitCode.ExecutionError;
  }

  if (error instanceof DriftGuardError) {
    log.stderr(error.message);
    return error.exitCode;
  }

  log.stderr(error instanceof Error ? error.message : 'An error occurred');
  return ExitCode.ExecutionError;
}

async function outputResult(
  result: ScanResult,
  json: boolean | undefined,
  sarifPath: string | undefined,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  if (json) {
    log.stdout(renderJsonReport(result));
  } else {
    log.stdout(renderTerminalReport(result));
  }

  if (sarifPath) {
    const sarif = renderSarifReport(result);
    await writeFile(sarifPath, JSON.stringify(sarif, null, 2));
  }

  return mapStatusToExitCode(result.status);
}

export function mapStatusToExitCode(status: ScanResult['status']): number {
  switch (status) {
    case 'ok':
      return ExitCode.Ok;
    case 'drift_found':
      return ExitCode.DriftFound;
    case 'error':
      return ExitCode.ExecutionError;
  }
}
