import { describe, expect, it } from 'vitest';

import type { ScanResult } from '../../../src/types/scan.js';
import { buildJsonReport, renderJsonReport } from '../../../src/reporting/json.js';

describe('json reporter', () => {
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

  const enrichedDriftResult: ScanResult = {
    status: 'drift_found',
    totalFindings: 2,
    findings: [
      {
        id: 'a-openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        method: 'GET',
        path: '/users/{id}',
        affectedFiles: ['src/routes/users.ts'],
        specReferences: ['specs/openapi.yml'],
        specCitations: [
          { filePath: 'specs/openapi.yml', sectionOrOperation: 'GET /users/{id}', startLine: 42, endLine: 48 },
        ],
        codeEvidence: [
          { filePath: 'src/routes/users.ts', startLine: 10, endLine: 15, snippet: 'router.get("/users/:id")' },
        ],
        explanation: {
          expected: 'router.get("/users/:id", handler)',
          found: 'router.get("/users/:id") without handler',
          reason: 'Route handler is missing',
        },
      },
      {
        id: 'z-openapi-route-exists:GET|/orders/{id}|specs/openapi.yml',
        summary: 'OpenAPI operation is not implemented by an indexed route',
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        method: 'GET',
        path: '/orders/{id}',
        affectedFiles: ['src/routes/orders.ts'],
        specReferences: ['specs/openapi.yml'],
      },
    ],
    warnings: [],
    config: {
      repo: '/tmp/repo',
      spec: [],
      code: [],
    },
  };

  describe('buildJsonReport', () => {
    it('includes status from scan result', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.status).toBe('ok');
    });

    it('includes totalFindings', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.totalFindings).toBe(0);
    });

    it('includes findings array', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.findings).toEqual([]);
    });

    it('includes warnings array', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.warnings).toEqual([]);
    });

    it('includes config', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.config).toEqual(noDriftResult.config);
    });

    it('includes summary', () => {
      const report = buildJsonReport(noDriftResult);
      expect(report.summary).toEqual({
        totalFindings: 0,
        totalWarnings: 0,
        enrichedFindings: 0,
        status: 'ok',
      });
    });

    it('sorts findings deterministically by id', () => {
      const result: ScanResult = {
        ...driftResult,
        findings: [
          {
            id: 'z-openapi-route-exists:GET|/orders/{id}|specs/openapi.yml',
            summary: 'OpenAPI operation is not implemented by an indexed route',
            severity: 'high',
            confidence: 'high',
            mappingConfidence: 'medium',
            method: 'GET',
            path: '/orders/{id}',
            affectedFiles: ['src/routes/orders.ts'],
            specReferences: ['specs/openapi.yml'],
          },
          {
            id: 'a-openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
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
      };

      const report = buildJsonReport(result);
      expect(report.findings[0].id).toBe(
        'a-openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
      );
      expect(report.findings[1].id).toBe(
        'z-openapi-route-exists:GET|/orders/{id}|specs/openapi.yml',
      );
    });

    it('sorts warnings deterministically by filePath then message', () => {
      const result: ScanResult = {
        ...driftResult,
        warnings: [
          { filePath: 'src/routes/b.ts', message: 'second' },
          { filePath: 'src/routes/a.ts', message: 'first' },
          { filePath: 'src/routes/a.ts', message: 'second' },
        ],
      };

      const report = buildJsonReport(result);
      expect(report.warnings[0]).toEqual({
        filePath: 'src/routes/a.ts',
        message: 'first',
      });
      expect(report.warnings[1]).toEqual({
        filePath: 'src/routes/a.ts',
        message: 'second',
      });
      expect(report.warnings[2]).toEqual({
        filePath: 'src/routes/b.ts',
        message: 'second',
      });
    });

    it('drift result has drift_found status and finding', () => {
      const report = buildJsonReport(driftResult);
      expect(report.status).toBe('drift_found');
      expect(report.totalFindings).toBe(1);
      expect(report.findings).toHaveLength(1);
      expect(report.findings[0].method).toBe('GET');
      expect(report.findings[0].path).toBe('/users/{id}');
    });

    it('drift result summary reflects findings and warnings', () => {
      const report = buildJsonReport(driftResult);
      expect(report.summary.totalFindings).toBe(1);
      expect(report.summary.totalWarnings).toBe(1);
      expect(report.summary.status).toBe('drift_found');
      expect(report.summary.enrichedFindings).toBe(0);
    });

    it('enriched findings include specCitations, codeEvidence, and explanation', () => {
      const report = buildJsonReport(enrichedDriftResult);
      expect(report.findings).toHaveLength(2);
      expect(report.findings[0].specCitations).toEqual([
        { filePath: 'specs/openapi.yml', sectionOrOperation: 'GET /users/{id}', startLine: 42, endLine: 48 },
      ]);
      expect(report.findings[0].codeEvidence).toEqual([
        { filePath: 'src/routes/users.ts', startLine: 10, endLine: 15, snippet: 'router.get("/users/:id")' },
      ]);
      expect(report.findings[0].explanation).toEqual({
        expected: 'router.get("/users/:id", handler)',
        found: 'router.get("/users/:id") without handler',
        reason: 'Route handler is missing',
      });
      expect(report.findings[1].specCitations).toBeUndefined();
      expect(report.findings[1].codeEvidence).toBeUndefined();
      expect(report.findings[1].explanation).toBeUndefined();
    });

    it('summary includes enrichedFindings count', () => {
      const report = buildJsonReport(enrichedDriftResult);
      expect(report.summary.enrichedFindings).toBe(1);
    });

    it('includes historical data when present', () => {
      const resultWithHistorical = {
        ...driftResult,
        historical: {
          sinceRef: 'HEAD~2',
          currentFindings: driftResult.findings,
          historicalFindings: [],
          newFindings: driftResult.findings,
          resolvedFindings: [],
          persistedFindings: [],
        },
      } as ScanResult & {
        historical: {
          sinceRef: string;
          currentFindings: ScanResult['findings'];
          historicalFindings: ScanResult['findings'];
          newFindings: ScanResult['findings'];
          resolvedFindings: ScanResult['findings'];
          persistedFindings: ScanResult['findings'];
        };
      };

      const report = buildJsonReport(resultWithHistorical as ScanResult);
      expect(report).toHaveProperty('historical');
      expect((report as { historical: { sinceRef: string } }).historical.sinceRef).toBe('HEAD~2');
    });
  });

  describe('renderJsonReport', () => {
    it('returns valid JSON string', () => {
      const json = renderJsonReport(noDriftResult);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('no-drift output is valid JSON with no findings', () => {
      const json = renderJsonReport(noDriftResult);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe('ok');
      expect(parsed.totalFindings).toBe(0);
      expect(parsed.findings).toEqual([]);
    });

    it('drift output includes all required fields', () => {
      const json = renderJsonReport(driftResult);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe('drift_found');
      expect(parsed.totalFindings).toBe(1);
      expect(parsed.findings).toHaveLength(1);
      expect(parsed.findings[0].id).toBe(
        'openapi-route-exists:GET|/users/{id}|specs/openapi.yml',
      );
      expect(parsed.warnings).toHaveLength(1);
      expect(parsed.config).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });

    it('output is stable across multiple renders', () => {
      const json1 = renderJsonReport(driftResult);
      const json2 = renderJsonReport(driftResult);
      expect(json1).toBe(json2);
    });
  });
});
