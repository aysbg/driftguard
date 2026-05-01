import { describe, expect, it } from 'vitest';
import { renderSarifReport } from '../../../src/reporting/sarif.js';
import type { ScanResult } from '../../../src/types/scan.js';

function makeResult(findings: ScanResult['findings'], warnings: ScanResult['warnings'] = []): ScanResult {
  return {
    status: findings.length > 0 ? 'drift_found' : 'ok',
    totalFindings: findings.length,
    findings,
    warnings,
    config: { repo: '.', spec: ['docs'], code: ['src'] },
  };
}

describe('renderSarifReport', () => {
  it('produces valid SARIF 2.1.0 document with findings', () => {
    const result = makeResult([
      {
        id: 'finding-1',
        summary: 'High severity finding',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'high',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
      {
        id: 'finding-2',
        summary: 'Medium severity finding',
        severity: 'medium',
        confidence: 'high',
        mappingConfidence: 'high',
        affectedFiles: ['src/routes/orders.ts'],
        specReferences: ['specs/openapi.yml'],
        codeEvidence: [
          { filePath: 'src/routes/orders.ts', startLine: 10, endLine: 20, snippet: 'some code' },
        ],
      },
    ]);

    const sarif = renderSarifReport(result);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-spec');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('driftguard');
    expect(sarif.runs[0].results).toHaveLength(2);

    const r1 = sarif.runs[0].results[0];
    expect(r1.ruleId).toBe('finding-1');
    expect(r1.level).toBe('error');
    expect(r1.message.text).toBe('High severity finding');

    const r2 = sarif.runs[0].results[1];
    expect(r2.ruleId).toBe('finding-2');
    expect(r2.level).toBe('warning');
    expect(r2.message.text).toBe('Medium severity finding');
    expect(r2.locations).toBeDefined();
    expect(r2.locations![0].physicalLocation.artifactLocation.uri).toBe('src/routes/orders.ts');
    expect(r2.locations![0].physicalLocation.region!.startLine).toBe(10);
  });

  it('produces valid SARIF with zero findings', () => {
    const result = makeResult([]);
    const sarif = renderSarifReport(result);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results).toEqual([]);
  });

  it('includes warnings as tool execution notifications', () => {
    const result = makeResult([], [
      { filePath: 'specs/openapi.yml', message: 'Could not resolve ref' },
    ]);
    const sarif = renderSarifReport(result);
    expect(sarif.runs[0].invocations).toBeDefined();
    expect(sarif.runs[0].invocations![0].executionSuccessful).toBe(true);
    expect(sarif.runs[0].invocations![0].toolExecutionNotifications).toHaveLength(1);
    expect(sarif.runs[0].invocations![0].toolExecutionNotifications![0].message.text).toContain('Could not resolve ref');
  });

  it('produces JSON that can be stringified and parsed', () => {
    const result = makeResult([
      {
        id: 'finding-3',
        summary: 'Low severity finding',
        severity: 'low',
        confidence: 'high',
        mappingConfidence: 'high',
        affectedFiles: ['src/routes/items.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    ]);
    const sarif = renderSarifReport(result);
    const json = JSON.stringify(sarif);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].results[0].level).toBe('note');
  });
});
