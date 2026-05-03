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

  it('indexes NestJS controller decorators with literal paths', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'driftguard-routes-'));

    try {
      const filePath = resolve(repoRoot, 'src/controllers/users.controller.ts');
      mkdirSync(resolve(repoRoot, 'src/controllers'), { recursive: true });
      writeFileSync(
        filePath,
        [
          "import { Controller, Get, Post } from '@nestjs/common';",
          '',
          "@Controller('users')",
          'class UsersController {',
          '  @Get()',
          '  list() {}',
          '',
          '  @Post()',
          '  create() {}',
          '',
          "  @Get(':id')",
          '  findOne() {}',
          '}'
        ].join('\n'),
        'utf8'
      );

      const sourceFile = loadSourceFile(filePath);

      expect(indexRoutesInSourceFile(sourceFile, repoRoot)).toEqual([
        {
          method: 'GET',
          path: '/users',
          filePath: 'src/controllers/users.controller.ts',
          line: 5,
          snippet: '@Get()'
        },
        {
          method: 'POST',
          path: '/users',
          filePath: 'src/controllers/users.controller.ts',
          line: 8,
          snippet: '@Post()'
        },
        {
          method: 'GET',
          path: '/users/{id}',
          filePath: 'src/controllers/users.controller.ts',
          line: 11,
          snippet: "@Get(':id')"
        }
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('ignores NestJS decorators with non-literal arguments', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'driftguard-routes-'));

    try {
      const filePath = resolve(repoRoot, 'src/controllers/users.controller.ts');
      mkdirSync(resolve(repoRoot, 'src/controllers'), { recursive: true });
      writeFileSync(
        filePath,
        [
          "import { Controller, Get } from '@nestjs/common';",
          '',
          "const dynamicPath = 'users';",
          '@Controller(dynamicPath)',
          'class UsersController {',
          "  @Get(':id')",
          '  findOne() {}',
          '}'
        ].join('\n'),
        'utf8'
      );

      const sourceFile = loadSourceFile(filePath);

      expect(indexRoutesInSourceFile(sourceFile, repoRoot)).toEqual([]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
