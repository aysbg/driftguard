import { resolveConfig } from '../config/resolver.js';
import { preflightConfig } from '../config/preflight.js';
import { runScan } from '../orchestrator/run-scan.js';
import { saveBaseline, clearBaseline, listBaselines } from '../baseline/manager.js';
import { computeBlastRadius } from '../finding/blast-radius.js';
import { assignSeverity, sortBySeverity } from '../finding/prioritization.js';

export interface BaselineCommandOptions {
  repo?: string;
  spec?: string[];
  code?: string[];
  name?: string;
}

export async function executeBaselineSave(
  options: BaselineCommandOptions,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  try {
    const config = await resolveConfig(options);
    const scanInput = await preflightConfig(config);
    const result = await runScan(scanInput);

    // Epic 4: enrich findings with blast radius and severity rationale before saving baseline
    const findings = sortBySeverity(
      result.findings.map((f) => {
        const blastRadius = computeBlastRadius(f, undefined);
        return assignSeverity({ ...f, blastRadius }, {});
      }),
    );

    const name = options.name ?? 'default';
    const filePath = await saveBaseline(scanInput.repo, name, findings);
    log.stdout(`Baseline saved: ${filePath} (${findings.length} findings)`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    log.stderr(message);
    return 2;
  }
}

export async function executeBaselineClear(
  options: BaselineCommandOptions,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  try {
    const config = await resolveConfig(options);
    const name = options.name ?? 'default';
    await clearBaseline(config.repo, name);
    log.stdout(`Baseline cleared: ${name}`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    log.stderr(message);
    return 2;
  }
}

export async function executeBaselineList(
  options: Pick<BaselineCommandOptions, 'repo'>,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  try {
    const config = await resolveConfig(options);
    const names = await listBaselines(config.repo);
    if (names.length === 0) {
      log.stdout('No baselines found');
    } else {
      for (const name of names) {
        log.stdout(name);
      }
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    log.stderr(message);
    return 2;
  }
}
