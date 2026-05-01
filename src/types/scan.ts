import type { ScanInput } from './config.js';
import type { DriftFinding } from './finding.js';
import type { ParseWarning } from './spec.js';

export type ScanStatus = 'ok' | 'drift_found' | 'error';

export interface ScanResult {
  status: ScanStatus;
  totalFindings: number;
  findings: DriftFinding[];
  warnings: ParseWarning[];
  config: ScanInput;
}
