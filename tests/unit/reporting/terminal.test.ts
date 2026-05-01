import { describe, expect, it } from 'vitest';

import type { ScanResult } from '../../../src/types/scan.js';
import type { Explanation, SpecCitation, CodeEvidence, BlastRadius, SeverityRationale } from '../../../src/types/finding.js';
import { renderTerminalReport } from '../../../src/reporting/terminal.js';

describe('terminal reporter', () => {
  const noDriftResult: ScanResult = {
    status: 'ok',
    totalFindings: 0,
    findings: [],
    warnings: [],
    config: {
      repo: '/tmp/repo',
      spec: [],
      code: [],
    },
  };

  const driftResult: ScanResult = {
    status: 'drift_found',
    totalFindings: 1,
    findings: [
      {
        id: 'openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        method: 'GET',
        path: '/users/{id}',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    ],
    warnings: [
      {
        filePath: 'src/routes/users.ts',
        message: 'extra_route_not_in_spec: GET /health',
      },
    ],
    config: {
      repo: '/tmp/repo',
      spec: [],
      code: [],
    },
  };

  const driftResultWithEnrichments: ScanResult = {
    status: 'drift_found',
    totalFindings: 1,
    findings: [
      {
        id: 'openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        method: 'GET',
        path: '/users/{id}',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
        explanation: {
          expected: 'Operation GET /users/{id} in OpenAPI spec',
          found: 'No matching route in codebase',
          reason: 'Route is documented but not implemented',
        } satisfies Explanation,
        specCitations: [
          {
            filePath: 'specs/openapi.yml',
            startLine: 10,
            endLine: 25,
          } satisfies SpecCitation,
        ],
        codeEvidence: [
          {
            filePath: 'src/routes/users.ts',
            startLine: 42,
          } satisfies CodeEvidence,
        ],
      },
    ],
    warnings: [],
    config: {
      repo: '/tmp/repo',
      spec: [],
      code: [],
    },
  };

  it('no-drift includes No drift found', () => {
    const output = renderTerminalReport(noDriftResult);
    expect(output).toContain('No drift found');
  });

  it('no-drift includes Total findings: 0', () => {
    const output = renderTerminalReport(noDriftResult);
    expect(output).toContain('Total findings: 0');
  });

  it('no-drift includes warnings count', () => {
    const output = renderTerminalReport(noDriftResult);
    expect(output).toContain('Warnings: 0');
  });

  it('drift includes Drift found', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('Drift found');
  });

  it('drift includes method and path', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('GET /users/{id}');
  });

  it('drift includes affected file', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('src/routes/users.ts');
  });

  it('drift includes spec reference', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('specs/openapi.yml');
  });

  it('drift includes total findings count', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('Total findings: 1');
  });

  it('drift includes warnings count', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('Warnings: 1');
  });

  it('drift includes severity and confidence', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('Severity: high');
    expect(output).toContain('Confidence: high');
  });

  it('status line is present', () => {
    const output = renderTerminalReport(noDriftResult);
    expect(output).toContain('Status: ok');
  });

  it('status line reflects drift_found', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).toContain('Status: drift_found');
  });

  it('drift with explanation includes expected, found, and reason', () => {
    const output = renderTerminalReport(driftResultWithEnrichments);
    expect(output).toContain('Expected: Operation GET /users/{id} in OpenAPI spec');
    expect(output).toContain('Found: No matching route in codebase');
    expect(output).toContain('Reason: Route is documented but not implemented');
  });

  it('drift with specCitations includes Referenced in line', () => {
    const output = renderTerminalReport(driftResultWithEnrichments);
    expect(output).toContain('Referenced in: specs/openapi.yml line 10-25');
  });

  it('drift with codeEvidence includes Affected code line', () => {
    const output = renderTerminalReport(driftResultWithEnrichments);
    expect(output).toContain('Affected code: src/routes/users.ts:42');
  });

  it('no-drift output is grep-friendly with no spinners', () => {
    const output = renderTerminalReport(noDriftResult);
    expect(output).not.toMatch(/\x1B\[.*[A-Za-z]/); // no ANSI escape sequences
    expect(output).not.toMatch(/[|]/); // no spinners
  });

  it('drift output is grep-friendly with no spinners', () => {
    const output = renderTerminalReport(driftResult);
    expect(output).not.toMatch(/\x1B\[.*[A-Za-z]/);
    expect(output).not.toMatch(/[|]/);
  });

  const driftResultEpic4: ScanResult = {
    ...driftResult,
    findings: [
      {
        ...driftResult.findings[0],
        blastRadius: {
          level: 'limited',
          impactedArtifacts: [{ type: 'file', name: 'src/routes/users.ts' }],
        } satisfies BlastRadius,
        severityRationale: {
          factors: ['Missing API route — breaks contract'],
          score: 1,
        } satisfies SeverityRationale,
        baselineStatus: 'new',
        remediationHint: 'Add route handler for GET /users/{id}',
      },
    ],
  };

  it('renders blast radius label and impacted artifacts', () => {
    const output = renderTerminalReport(driftResultEpic4);
    expect(output).toContain('Blast radius: limited');
    expect(output).toContain('file: src/routes/users.ts');
  });

  it('renders severity rationale factors', () => {
    const output = renderTerminalReport(driftResultEpic4);
    expect(output).toContain('Severity rationale:');
    expect(output).toContain('Missing API route — breaks contract');
  });

  it('renders baseline status prefix', () => {
    const output = renderTerminalReport(driftResultEpic4);
    expect(output).toContain('[NEW]');
  });

  it('renders remediation hint', () => {
    const output = renderTerminalReport(driftResultEpic4);
    expect(output).toContain('Remediation: Add route handler for GET /users/{id}');
  });
});