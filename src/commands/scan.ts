import { renderJsonReport } from '../reporting/json.js';
import { renderTerminalReport } from '../reporting/terminal.js';
import { resolveConfig } from '../config/resolver.js';
import { preflightConfig } from '../config/preflight.js';
import { runScan } from '../orchestrator/run-scan.js';
import { DriftGuardError, ExitCode } from '../errors.js';
import type { ScanResult } from '../types/scan.js';
import type { ScanCliOptions } from '../config/resolver.js';

export interface ScanCommandOptions extends ScanCliOptions {
  json?: boolean;
}

export async function executeScan(
  options: ScanCommandOptions,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  try {
    const config = await resolveConfig(options);
    const scanInput = await preflightConfig(config);
    const result = await runScan(scanInput);
    return outputResult(result, options.json, log);
  } catch (error) {
    return handleError(error, options.json, log);
  }
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

function outputResult(
  result: ScanResult,
  json: boolean | undefined,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): number {
  if (json) {
    log.stdout(renderJsonReport(result));
  } else {
    log.stdout(renderTerminalReport(result));
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
