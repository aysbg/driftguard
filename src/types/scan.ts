import type { ScanInput } from './config.js';
import type { DriftFinding } from './finding.js';
import type { ParseWarning } from './spec.js';
import type { BaselineComparisonResult } from './baseline.js';

export type ScanStatus = 'ok' | 'drift_found' | 'error';

export interface ScanResult {
  status: ScanStatus;
  totalFindings: number;
  findings: DriftFinding[];
  warnings: ParseWarning[];
  config: ScanInput;
  baselineComparison?: {
    baselineName: string;
    findings: BaselineComparisonResult[];
  };
  comparisonUnavailable?: string;
}
