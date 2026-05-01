import { dirname } from 'node:path';
import { stat, writeFile } from 'node:fs/promises';
import { renderJsonReport } from '../reporting/json.js';
import { renderTerminalReport } from '../reporting/terminal.js';
import { renderSarifReport } from '../reporting/sarif.js';
import { resolveConfig, parseFailOn } from '../config/resolver.js';
import { preflightConfig } from '../config/preflight.js';
import { runScan } from '../orchestrator/run-scan.js';
import { evaluateEnforcement } from '../thresholds/enforcement.js';
import { getChangedFiles } from '../git/changed-files.js';
import { DriftGuardError, ExitCode } from '../errors.js';
import type { ScanResult } from '../types/scan.js';
import type { ScanCliOptions } from '../config/resolver.js';
import type { FindingSeverity } from '../types/config.js';

export interface ScanCommandOptions extends ScanCliOptions {
  json?: boolean;
  ci?: boolean;
  failOn?: string[];
  changedOnly?: boolean;
  baseRef?: string;
  sarif?: string;
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

    const result = await runScan(scanInput);
    const failOn = ciConfig?.failOn;
    const { shouldFail } = evaluateEnforcement(result.findings, failOn);

    const effectiveResult: ScanResult = {
      ...result,
      status: shouldFail ? 'drift_found' : 'ok',
    };

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
