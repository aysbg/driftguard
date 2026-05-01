import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../helpers/run-cli.js';
import { ExitCode } from '../../src/errors.js';

const fixturesRoot = resolve('tests/fixtures');

describe('scan command', () => {
  it('exits 0 with --help', async () => {
    const result = await runCli(['scan', '--help']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage');
    expect(result.stdout).toContain('--repo');
    expect(result.stdout).toContain('--spec');
    expect(result.stdout).toContain('--code');
    expect(result.stdout).toContain('--config');
    expect(result.stdout).toContain('--json');
  });

  it('exits 2 when repo path does not exist', async () => {
    const result = await runCli(['scan', '--repo', resolve(fixturesRoot, 'does-not-exist'), '--json']);

    expect(result.status).toBe(ExitCode.ExecutionError);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('error');
    expect(json.totalFindings).toBe(0);
    expect(json.findings).toEqual([]);
    expect(json.warnings).toEqual([]);
    expect(json.error).toContain('repo path does not exist');
  });

  it('exits 0 for valid repo with no drift in text mode', async () => {
    const result = await runCli(['scan', '--repo', resolve(fixturesRoot, 'no-drift')]);

    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('No drift found');
    expect(result.stdout).toContain('Total findings: 0');
    expect(result.stderr).toBe('');
  });

  it('exits 0 for valid repo with no drift in json mode', async () => {
    const result = await runCli(['scan', '--repo', resolve(fixturesRoot, 'no-drift'), '--json']);

    expect(result.status).toBe(ExitCode.Ok);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('ok');
    expect(json.totalFindings).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it('no-drift with explicit spec override runs successfully', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'no-drift'),
      '--spec', 'specs/openapi.yml',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.Ok);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('ok');
    expect(json.totalFindings).toBe(0);
  });

  it('adr filename pattern without frontmatter still produces section findings', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'adr-no-frontmatter'),
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('markdown-section-unmapped:'))).toBe(true);
  });

  it('accumulates repeated --spec values and fails when any path is invalid', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'no-drift'),
      '--spec', 'missing.yml',
      '--spec', 'specs/openapi.yml',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.ExecutionError);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('error');
    expect(json.error).toContain('spec path does not exist');
  });

  it('accumulates repeated --code values and fails when any path is invalid', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'no-drift'),
      '--code', 'missing-dir',
      '--code', 'src',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.ExecutionError);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('error');
    expect(json.error).toContain('code path does not exist');
  });

  it('detects missing route in json mode', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'missing-route'),
      '--spec', 'specs',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('drift_found');
    expect(json.totalFindings).toBe(1);
    expect(json.findings.length).toBe(1);
    const finding = json.findings[0];
    expect(finding.method).toBe('GET');
    expect(finding.path).toBe('/users/{id}');
    expect(finding.explanation?.expected).toBe('OpenAPI defines GET /users/{id} with parameters [path: id]');
    expect(finding.explanation?.found).toBe('No matching route implementation found in code');
    expect(finding.explanation?.reason).toBe('The documented API operation has no corresponding route handler');
  });

  it('adr-example json includes ADR section findings when unmapped', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'adr-example'),
      '--json',
    ]);

    const json = JSON.parse(result.stdout);
    const sectionFindings = json.findings.filter((finding: { id: string }) =>
      finding.id.startsWith('markdown-section-unmapped:')
    );

    expect(sectionFindings.length).toBeGreaterThan(0);
    expect(
      sectionFindings.some((finding: { specReferences: string[] }) =>
        finding.specReferences.some((reference) => reference.includes('adr-001-use-structured-logging.md'))
      )
    ).toBe(true);
  });

  it('section-mapping json includes route and section findings', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'section-mapping'),
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    const json = JSON.parse(result.stdout);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('openapi-route-exists:'))).toBe(true);
    expect(json.findings.some((finding: { id: string }) => finding.id.startsWith('markdown-section-unmapped:'))).toBe(true);
  });

  it('parse-warning fixture includes warnings', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'parse-warning'),
      '--spec', 'specs',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.Ok);
    const json = JSON.parse(result.stdout);
    expect(json.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('config override uses cli --spec over config', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'config-override'),
      '--config', resolve(fixturesRoot, 'config-override/.driftguard.yml'),
      '--spec', 'specs/override-openapi.yml',
      '--json',
    ]);

    expect(result.status).toBe(ExitCode.Ok);
    const json = JSON.parse(result.stdout);
    expect(json.status).toBe('ok');
    expect(json.totalFindings).toBe(0);
    expect(json.findings).toEqual([]);
  });

  it('detects missing route in text mode', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'missing-route'),
      '--spec', 'specs',
    ]);

    expect(result.status).toBe(ExitCode.DriftFound);
    expect(result.stdout).toContain('Drift found');
    expect(result.stdout).toContain('GET /users/{id}');
    expect(result.stdout).toContain('src/routes/users.ts');
    expect(result.stdout).toContain('specs/openapi.yml');
  });

  it('no drift in text mode', async () => {
    const result = await runCli([
      'scan',
      '--repo', resolve(fixturesRoot, 'no-drift'),
    ]);

    expect(result.status).toBe(ExitCode.Ok);
    expect(result.stdout).toContain('No drift found');
    expect(result.stdout).toContain('Total findings: 0');
  });
});
