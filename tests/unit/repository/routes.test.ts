import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { indexRoutesInSourceFile } from '../../../src/repository/routes.js';

function loadSourceFile(filePath: string) {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  return project.addSourceFileAtPath(filePath);
}

describe('indexRoutesInSourceFile', () => {
  it('indexes express route', () => {
    const repoRoot = resolve('tests/fixtures/no-drift');
    const filePath = resolve(repoRoot, 'src/routes/users.ts');
    const sourceFile = loadSourceFile(filePath);

    const routes = indexRoutesInSourceFile(sourceFile, repoRoot);

    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({
      method: 'GET',
      path: '/users/{id}',
      filePath: 'src/routes/users.ts',
      line: 5
    });
    expect(routes[0]?.snippet).toContain("router.get('/users/:id'");
  });

  it('supports app and fastify route declarations', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'driftguard-routes-'));

    try {
      const filePath = resolve(repoRoot, 'src/routes/api.ts');
      mkdirSync(resolve(repoRoot, 'src/routes'), { recursive: true });
      writeFileSync(
        filePath,
        [
          'const app = {',
          '  post(_path: string, _handler: () => void) {}',
          '};',
          'const fastify = {',
          '  delete(_path: string, _handler: () => void) {}',
          '};',
          '',
          "app.post('/users', () => {});",
          "fastify.delete('/users/:id', () => {});"
        ].join('\n'),
        'utf8'
      );

      const sourceFile = loadSourceFile(filePath);

      expect(indexRoutesInSourceFile(sourceFile, repoRoot)).toEqual([
        {
          method: 'POST',
          path: '/users',
          filePath: 'src/routes/api.ts',
          line: 8,
          snippet: "app.post('/users', () => {})"
        },
        {
          method: 'DELETE',
          path: '/users/{id}',
          filePath: 'src/routes/api.ts',
          line: 9,
          snippet: "fastify.delete('/users/:id', () => {})"
        }
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
