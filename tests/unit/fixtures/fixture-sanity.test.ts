import { readFileSync, statSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';

const fixturesRoot = resolve('tests/fixtures');

describe('no-drift fixture', () => {
  it('specs/openapi.yml defines GET /users/{id}', () => {
    const specPath = resolve(fixturesRoot, 'no-drift/specs/openapi.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.paths['/users/{id}']).toBeDefined();
    expect(doc.paths['/users/{id}'].get).toBeDefined();
    expect(doc.paths['/users/{id}'].get.operationId).toBe('getUserById');
  });

  it('docs/requirements.md contains relevant heading', () => {
    const docPath = resolve(fixturesRoot, 'no-drift/docs/requirements.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('User');
  });

  it('src/routes/users.ts contains Express route GET /users/:id', () => {
    const routePath = resolve(fixturesRoot, 'no-drift/src/routes/users.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).toContain("router.get('/users/:id'");
  });
});

describe('missing-route fixture', () => {
  it('specs/openapi.yml defines GET /users/{id}', () => {
    const specPath = resolve(fixturesRoot, 'missing-route/specs/openapi.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.paths['/users/{id}']).toBeDefined();
    expect(doc.paths['/users/{id}'].get).toBeDefined();
  });

  it('src/routes/users.ts intentionally lacks GET /users/:id', () => {
    const routePath = resolve(fixturesRoot, 'missing-route/src/routes/users.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).not.toContain("router.get('/users/:id'");
    expect(content).toContain("router.get('/health'");
  });
});

describe('config-override fixture', () => {
  it('has .driftguard.yml config file', () => {
    const configPath = resolve(fixturesRoot, 'config-override/.driftguard.yml');
    const content = readFileSync(configPath, 'utf8');
    const doc = parse(content);
    expect(doc.spec).toContain('specs/config-openapi.yml');
    expect(doc.code).toContain('src');
  });

  it('has override spec file', () => {
    const specPath = resolve(fixturesRoot, 'config-override/specs/override-openapi.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.paths['/users']).toBeDefined();
  });
});

describe('scoped fixture', () => {
  it('has specs and docs directories', () => {
    const specsPath = resolve(fixturesRoot, 'scoped/specs/openapi.yml');
    const docsPath = resolve(fixturesRoot, 'scoped/docs/requirements.md');
    expect(() => readFileSync(specsPath, 'utf8')).not.toThrow();
    expect(() => readFileSync(docsPath, 'utf8')).not.toThrow();
  });

  it('has src/routes and src/utils', () => {
    const routePath = resolve(fixturesRoot, 'scoped/src/routes/items.ts');
    const utilsPath = resolve(fixturesRoot, 'scoped/src/utils/formatters.ts');
    expect(() => readFileSync(routePath, 'utf8')).not.toThrow();
    expect(() => readFileSync(utilsPath, 'utf8')).not.toThrow();
  });
});

describe('parse-warning fixture', () => {
  it('has valid and invalid spec files', () => {
    const validPath = resolve(fixturesRoot, 'parse-warning/specs/valid.yml');
    const invalidPath = resolve(fixturesRoot, 'parse-warning/specs/invalid.yml');
    expect(() => readFileSync(validPath, 'utf8')).not.toThrow();
    expect(() => readFileSync(invalidPath, 'utf8')).not.toThrow();
  });
});

describe('not-a-directory fixture', () => {
  it('is a file, not a directory', () => {
    const path = resolve(fixturesRoot, 'not-a-directory');
    const stat = statSync(path);
    expect(stat.isFile()).toBe(true);
    expect(stat.isDirectory()).toBe(false);
  });
});

describe('adr-example fixture', () => {
  it('docs/adr-001-use-structured-logging.md has valid YAML frontmatter', () => {
    const docPath = resolve(fixturesRoot, 'adr-example/docs/adr-001-use-structured-logging.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('---');
    expect(content).toContain('status: proposed');
    expect(content).toContain('decision: Use structured logging');
  });

  it('specs/openapi.yml defines GET /users/{id} with query param fields', () => {
    const specPath = resolve(fixturesRoot, 'adr-example/specs/openapi.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.paths['/users/{id}']).toBeDefined();
    expect(doc.paths['/users/{id}'].get).toBeDefined();
    expect(doc.paths['/users/{id}'].get.parameters).toHaveLength(2);
    const paramNames = doc.paths['/users/{id}'].get.parameters.map((p: { name: string }) => p.name);
    expect(paramNames).toContain('id');
    expect(paramNames).toContain('fields');
  });

  it('src/routes/users.ts has GET /users/:id route', () => {
    const routePath = resolve(fixturesRoot, 'adr-example/src/routes/users.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).toContain("router.get('/users/:id'");
  });

  it('.driftguard.yml has spec and code paths', () => {
    const configPath = resolve(fixturesRoot, 'adr-example/.driftguard.yml');
    const content = readFileSync(configPath, 'utf8');
    const doc = parse(content);
    expect(doc.spec).toContain('docs');
    expect(doc.spec).toContain('specs/openapi.yml');
    expect(doc.code).toContain('src');
  });
});

describe('rich-openapi fixture', () => {
  it('specs/api.yml is valid OpenAPI 3.0 with descriptions', () => {
    const specPath = resolve(fixturesRoot, 'rich-openapi/specs/api.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.paths['/users/{id}'].get.description).toBeDefined();
    expect(doc.paths['/users/{id}'].get.responses['200'].description).toContain('User found');
    expect(doc.paths['/users/{id}'].get.responses['404'].description).toContain('User not found');
  });

  it('src/routes/users.ts has GET /users/:id route', () => {
    const routePath = resolve(fixturesRoot, 'rich-openapi/src/routes/users.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).toContain("router.get('/users/:id'");
  });

  it('.driftguard.yml references specs/api.yml', () => {
    const configPath = resolve(fixturesRoot, 'rich-openapi/.driftguard.yml');
    const content = readFileSync(configPath, 'utf8');
    const doc = parse(content);
    expect(doc.spec).toContain('specs/api.yml');
  });
});

describe('section-mapping fixture', () => {
  it('docs/architecture.md contains routes and handlers sections', () => {
    const docPath = resolve(fixturesRoot, 'section-mapping/docs/architecture.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('## Routes Layer');
    expect(content).toContain('Route Handlers');
  });

  it('docs/requirements.md contains User Management section with /users endpoint', () => {
    const docPath = resolve(fixturesRoot, 'section-mapping/docs/requirements.md');
    const content = readFileSync(docPath, 'utf8');
    expect(content).toContain('## User Management');
    expect(content).toContain('/users');
  });

  it('specs/openapi.yml defines GET /users/{id}', () => {
    const specPath = resolve(fixturesRoot, 'section-mapping/specs/openapi.yml');
    const content = readFileSync(specPath, 'utf8');
    const doc = parse(content);
    expect(doc.paths['/users/{id}']).toBeDefined();
    expect(doc.paths['/users/{id}'].get).toBeDefined();
  });

  it('src/routes/users.ts has GET /users/:id route', () => {
    const routePath = resolve(fixturesRoot, 'section-mapping/src/routes/users.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).toContain("router.get('/users/:id'");
  });

  it('src/routes/orders.ts has orders routes (unrelated)', () => {
    const routePath = resolve(fixturesRoot, 'section-mapping/src/routes/orders.ts');
    const content = readFileSync(routePath, 'utf8');
    expect(content).toContain("router.get('/orders/:id'");
    expect(content).toContain("router.post('/orders'");
  });
});

describe('run-cli helper', () => {
  it('executes CLI and returns { status, stdout, stderr }', async () => {
    const { runCli } = await import(resolve('tests/helpers/run-cli.js'));
    const result = await runCli(['scan', '--help']);
    expect(result.status).toBe(0);
    expect(typeof result.stdout).toBe('string');
    expect(result.stdout).toContain('Usage');
    expect(typeof result.stderr).toBe('string');
  });
});