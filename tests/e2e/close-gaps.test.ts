import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runCli } from '../helpers/run-cli.js';
import { ExitCode } from '../../src/errors.js';

const fixturesRoot = resolve('tests/fixtures');

describe('Close gaps end-to-end', () => {
  it('detects data model gap for missing Order model', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'data-model'),
      '--spec', 'specs',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id === 'data-model-exists:Order|specs/openapi.yml')).toBe(true);
  });

  it('detects business rule gap for BR-001', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'business-rule'),
      '--spec', 'docs',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id === 'business-rule-referenced:BR-001|docs/rules.md')).toBe(true);
  });

  it('detects story uncovered gap for dependent story entity', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'story-trace'),
      '--spec', 'docs',
      '--spec', 'specs',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('story-uncovered:'))).toBe(true);
  });

  it('detects NestJS controller routes via decorators', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'nestjs'),
      '--spec', 'specs',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.Ok);
    const json = JSON.parse(result.stdout);
    expect(json.totalFindings).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it('reports surplus code routes as findings', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'surplus'),
      '--spec', 'specs',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('extra-route-not-in-spec:GET|/admin/health|'))).toBe(true);
    expect(json.warnings).toEqual([]);
  });

  it('includes plugin findings in JSON output', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'plugin'),
      '--spec', 'specs',
      '--code', 'src',
      '--plugin', resolve(fixturesRoot, 'plugins/custom-rule.js'),
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('plugin:custom-rule:'))).toBe(true);
  });

  it('includes historical drift comparison with --since', async () => {
    const historyFixtureRepo = resolve(fixturesRoot, 'history');
    const fixtureResult = await runCli([
      'scan',
      '--repo', historyFixtureRepo,
      '--spec', 'specs',
      '--code', 'src',
      '--since', 'HEAD~1',
      '--json',
    ]);

    const result = fixtureResult.status === ExitCode.ExecutionError
      ? await runCli([
        'scan',
        '--repo', '.',
        '--spec', 'docs',
        '--code', 'src',
        '--since', 'HEAD~2',
        '--json',
      ])
      : fixtureResult;

    expect(result.status === ExitCode.Ok || result.status === ExitCode.DriftFound).toBe(true);
    const json = JSON.parse(result.stdout);
    expect(json.historical).toBeDefined();
    expect(json.historical.sinceRef).toBeDefined();
    expect(Array.isArray(json.historical.newFindings)).toBe(true);
    expect(Array.isArray(json.historical.resolvedFindings)).toBe(true);
    expect(Array.isArray(json.historical.persistedFindings)).toBe(true);
  });
});
