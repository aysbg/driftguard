import type { ScanResult } from '../types/scan.js';
import type { DriftFinding } from '../types/finding.js';

/**
 * SARIF 2.1.0 log output.
 * This is a minimal, conformant SARIF log structure for DriftGuard findings.
 */
export interface SarifLog {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version?: string;
      rules?: SarifRule[];
    };
  };
  results: SarifResult[];
  invocations?: SarifInvocation[];
}

interface SarifRule {
  id: string;
  shortDescription?: { text: string };
  messageStrings?: Record<string, { text: string }>;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations?: SarifLocation[];
  properties?: Record<string, unknown>;
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: {
      uri: string;
    };
    region?: {
      startLine?: number;
      endLine?: number;
      snippet?: { text: string };
    };
  };
  logicalLocations?: SarifLogicalLocation[];
}

interface SarifLogicalLocation {
  name: string;
  kind: string;
}

interface SarifInvocation {
  executionSuccessful: boolean;
  toolExecutionNotifications?: SarifNotification[];
}

interface SarifNotification {
  descriptor: { id: string };
  level: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
}

function severityToLevel(severity: string): SarifResult['level'] {
  switch (severity) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'note';
    default:
      return 'none';
  }
}

function buildRules(findings: DriftFinding[]): SarifRule[] {
  const seen = new Set<string>();
  const rules: SarifRule[] = [];

  for (const f of findings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    const rule: SarifRule = {
      id: f.id,
      shortDescription: { text: f.summary },
    };
    if (f.severityRationale?.factors && f.severityRationale.factors.length > 0) {
      rule.messageStrings = { severityRationale: { text: f.severityRationale.factors.join('; ') } };
    }
    rules.push(rule);
  }

  return rules.sort((a, b) => a.id.localeCompare(b.id));
}

function buildResult(finding: DriftFinding): SarifResult {
  const locations: SarifLocation[] = [];

  if (finding.codeEvidence && finding.codeEvidence.length > 0) {
    for (const ev of finding.codeEvidence) {
      const regionParts: { startLine?: number; endLine?: number; snippet?: { text: string } } = {};
      if (ev.startLine !== undefined) regionParts.startLine = ev.startLine;
      if (ev.endLine !== undefined) regionParts.endLine = ev.endLine;
      if (ev.snippet !== undefined) regionParts.snippet = { text: ev.snippet };

      const physLoc: SarifLocation['physicalLocation'] = {
        artifactLocation: { uri: ev.filePath },
      };
      if (Object.keys(regionParts).length > 0) {
        physLoc.region = regionParts;
      }

      locations.push({
        physicalLocation: physLoc,
        logicalLocations: finding.method && finding.path
          ? [{ name: `${finding.method} ${finding.path}`, kind: 'route' }]
          : undefined,
      });
    }
  } else if (finding.affectedFiles.length > 0) {
    locations.push({
      physicalLocation: {
        artifactLocation: { uri: finding.affectedFiles[0] },
      },
    });
  }

  const properties: Record<string, unknown> = {};
  if (finding.blastRadius) {
    properties.blastRadius = finding.blastRadius;
  }
  if (finding.baselineStatus) {
    properties.baselineStatus = finding.baselineStatus;
  }

  return {
    ruleId: finding.id,
    level: severityToLevel(finding.severity),
    message: { text: finding.summary },
    locations: locations.length > 0 ? locations : undefined,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}

export function renderSarifReport(result: ScanResult): SarifLog {
  const sortedFindings = [...result.findings].sort((a, b) => a.id.localeCompare(b.id));
  const results: SarifResult[] = sortedFindings.map(buildResult);
  const rules = buildRules(sortedFindings);

  const run: SarifRun = {
    tool: {
      driver: {
        name: 'driftguard',
        version: '0.1.0',
        rules: rules.length > 0 ? rules : undefined,
      },
    },
    results,
  };

  if (result.warnings.length > 0) {
    run.invocations = [
      {
        executionSuccessful: result.status !== 'error',
        toolExecutionNotifications: result.warnings.map((w) => ({
          descriptor: { id: 'parse-warning' },
          level: 'warning',
          message: { text: `${w.filePath}: ${w.message}` },
        })),
      },
    ];
  }

  if (result.status === 'error') {
    if (!run.invocations) run.invocations = [{ executionSuccessful: false }];
    else run.invocations[0].executionSuccessful = false;
  }

  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [run],
  };
}
