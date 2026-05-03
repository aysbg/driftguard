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
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
      },
      {
        id: 'finding-2',
        summary: 'Medium severity finding',
        severity: 'medium',
        confidence: 'high',
        mappingConfidence: 'medium',
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
        mappingConfidence: 'medium',
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

  it('includes historical drift metadata when historical data is present', () => {
    const result = {
      ...makeResult([
        {
          id: 'finding-historical',
          summary: 'Historical test finding',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/items.ts'],
          specReferences: ['specs/openapi.yml'],
        },
      ]),
      historical: {
        sinceRef: 'HEAD~2',
        currentFindings: [],
        historicalFindings: [],
        newFindings: [{
          id: 'new-1',
          summary: 'New finding',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/new.ts'],
          specReferences: ['specs/openapi.yml'],
        }],
        resolvedFindings: [{
          id: 'resolved-1',
          summary: 'Resolved finding',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/resolved.ts'],
          specReferences: ['specs/openapi.yml'],
        }],
        persistedFindings: [{
          id: 'persisted-1',
          summary: 'Persisted finding',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/persisted.ts'],
          specReferences: ['specs/openapi.yml'],
        }, {
          id: 'persisted-2',
          summary: 'Persisted finding 2',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/persisted-2.ts'],
          specReferences: ['specs/openapi.yml'],
        }],
      },
    } as unknown as ScanResult;

    const sarif = renderSarifReport(result);
    expect(sarif.runs[0].properties).toEqual({
      historicalDrift: {
        sinceRef: 'HEAD~2',
        newFindings: 1,
        resolvedFindings: 1,
        persistedFindings: 2,
      },
    });
  });

  describe('severity to SARIF level mapping', () => {
    it('maps high severity to error level', () => {
      const result = makeResult([{
        id: 'finding-high',
        summary: 'High severity finding',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/api.ts'],
        specReferences: ['specs/openapi.yml'],
      }]);
      const sarif = renderSarifReport(result);
      expect(sarif.runs[0].results[0].level).toBe('error');
    });

    it('maps medium severity to warning level', () => {
      const result = makeResult([{
        id: 'finding-medium',
        summary: 'Medium severity finding',
        severity: 'medium',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/api.ts'],
        specReferences: ['specs/openapi.yml'],
      }]);
      const sarif = renderSarifReport(result);
      expect(sarif.runs[0].results[0].level).toBe('warning');
    });

    it('maps low severity to note level', () => {
      const result = makeResult([{
        id: 'finding-low',
        summary: 'Low severity finding',
        severity: 'low',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/api.ts'],
        specReferences: ['specs/openapi.yml'],
      }]);
      const sarif = renderSarifReport(result);
      expect(sarif.runs[0].results[0].level).toBe('note');
    });

    it('maps unknown severity to none level', () => {
      const result = makeResult([{
        id: 'finding-unknown',
        summary: 'Unknown severity finding',
        severity: 'unknown' as any,
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/api.ts'],
        specReferences: ['specs/openapi.yml'],
      }]);
      const sarif = renderSarifReport(result);
      expect(sarif.runs[0].results[0].level).toBe('none');
    });

    it('includes severityRationale as rule messageStrings', () => {
      const result = makeResult([{
        id: 'finding-rationale',
        summary: 'Finding with rationale',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['src/routes/api.ts'],
        specReferences: ['specs/openapi.yml'],
        severityRationale: {
          factors: ['public endpoint', 'no auth', 'handles PII'],
          score: 9,
        },
      }]);
      const sarif = renderSarifReport(result);
      const rule = sarif.runs[0].tool.driver.rules?.find(r => r.id === 'finding-rationale');
      expect(rule).toBeDefined();
      expect(rule!.messageStrings?.severityRationale.text).toBe('public endpoint; no auth; handles PII');
    });

    it('produces SARIF with all valid severity levels present', () => {
      const result = makeResult([
        {
          id: 'finding-high',
          summary: 'High severity finding',
          severity: 'high',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/high.ts'],
          specReferences: ['specs/openapi.yml'],
        },
        {
          id: 'finding-medium',
          summary: 'Medium severity finding',
          severity: 'medium',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/medium.ts'],
          specReferences: ['specs/openapi.yml'],
        },
        {
          id: 'finding-low',
          summary: 'Low severity finding',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/low.ts'],
          specReferences: ['specs/openapi.yml'],
        },
        {
          id: 'finding-unknown',
          summary: 'Unknown severity finding',
          severity: 'unknown' as any,
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/routes/unknown.ts'],
          specReferences: ['specs/openapi.yml'],
        },
      ]);
      const sarif = renderSarifReport(result);
      expect(sarif.runs[0].results).toHaveLength(4);
      expect(sarif.runs[0].results[0].level).toBe('error');  // finding-high
      expect(sarif.runs[0].results[1].level).toBe('note');  // finding-low
      expect(sarif.runs[0].results[2].level).toBe('warning'); // finding-medium
      expect(sarif.runs[0].results[3].level).toBe('none');   // finding-unknown
    });
  });
});
