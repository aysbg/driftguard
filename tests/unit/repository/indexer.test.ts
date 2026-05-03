import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexRepository } from '../../../src/repository/indexer.js';

describe('indexRepository', () => {
  it('respects configured code path', async () => {
    const repoRoot = resolve('tests/fixtures/scoped');

    const { index, warnings } = await indexRepository({
      repo: repoRoot,
      code: [resolve(repoRoot, 'src/routes')]
    });

    expect(warnings).toEqual([]);
    expect(index.files).toHaveLength(1);
    expect(index.files[0]).toMatchObject({
      filePath: 'src/routes/items.ts',
      models: [],
      routes: [
        {
          method: 'GET',
          path: '/items',
          filePath: 'src/routes/items.ts'
        }
      ],
      types: []
    });
    expect(index.files.map((file) => file.filePath)).not.toContain('src/utils/formatters.ts');
  });

  it('emits deterministic route ordering', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'driftguard-indexer-'));

    try {
      mkdirSync(resolve(repoRoot, 'src/routes'), { recursive: true });
      mkdirSync(resolve(repoRoot, 'src/utils'), { recursive: true });

      writeFileSync(
        resolve(repoRoot, 'src/routes/beta.ts'),
        [
          'const router = {',
          '  get(_path: string, _handler: () => void) {},',
          '  post(_path: string, _handler: () => void) {}',
          '};',
          '',
          "router.post('/beta', () => {});",
          "router.get('/beta/:id', () => {});"
        ].join('\n'),
        'utf8'
      );

      writeFileSync(
        resolve(repoRoot, 'src/routes/alpha.ts'),
        [
          'const app = {',
          '  get(_path: string, _handler: () => void) {}',
          '};',
          '',
          "app.get('/alpha', () => {});"
        ].join('\n'),
        'utf8'
      );

      writeFileSync(resolve(repoRoot, 'src/utils/formatters.ts'), 'export function format() { return "ok"; }\n', 'utf8');

      const input = {
        repo: repoRoot,
        code: [resolve(repoRoot, 'src')]
      };

      const first = await indexRepository(input);
      const second = await indexRepository(input);

      expect(first.warnings).toEqual([]);
      expect(second.warnings).toEqual([]);
      expect(first.index).toEqual(second.index);
      expect(first.index.files).toMatchObject([
        {
          filePath: 'src/routes/alpha.ts',
          models: [],
          routes: [
            {
              method: 'GET',
              path: '/alpha',
              filePath: 'src/routes/alpha.ts',
              line: 5,
              snippet: "app.get('/alpha', () => {})"
            }
          ],
          types: []
        },
        {
          filePath: 'src/routes/beta.ts',
          models: [],
          routes: [
            {
              method: 'POST',
              path: '/beta',
              filePath: 'src/routes/beta.ts',
              line: 6,
              snippet: "router.post('/beta', () => {})"
            },
            {
              method: 'GET',
              path: '/beta/{id}',
              filePath: 'src/routes/beta.ts',
              line: 7,
              snippet: "router.get('/beta/:id', () => {})"
            }
          ],
          types: []
        },
        {
          filePath: 'src/utils/formatters.ts',
          models: [],
          routes: [],
          types: []
        }
      ]);
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('extracts interfaces and type aliases with deterministic ordering', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'driftguard-indexer-models-'));

    try {
      mkdirSync(resolve(repoRoot, 'src'), { recursive: true });

      writeFileSync(
        resolve(repoRoot, 'src/models.ts'),
        [
          'export interface Zebra { value: string; }',
          'export type Alpha = { id: string };',
          'export interface AlphaModel { id: number; }',
          'export type ZebraAlias = string | number;',
          'export class IgnoredClass {}',
          'export enum IgnoredEnum { A = "A" }'
        ].join('\n'),
        'utf8'
      );

      const { index, warnings } = await indexRepository({
        repo: repoRoot,
        code: [resolve(repoRoot, 'src')]
      });

      expect(warnings).toEqual([]);
      expect(index.files).toHaveLength(1);
      expect(index.files[0]).toMatchObject({
        filePath: 'src/models.ts',
        routes: [],
        models: [
          {
            name: 'AlphaModel',
            kind: 'interface',
            filePath: 'src/models.ts',
            line: 3,
            snippet: 'export interface AlphaModel { id: number; }'
          },
          {
            name: 'Zebra',
            kind: 'interface',
            filePath: 'src/models.ts',
            line: 1,
            snippet: 'export interface Zebra { value: string; }'
          }
        ],
        types: [
          {
            name: 'Alpha',
            kind: 'type_alias',
            filePath: 'src/models.ts',
            line: 2,
            snippet: 'export type Alpha = { id: string };'
          },
          {
            name: 'ZebraAlias',
            kind: 'type_alias',
            filePath: 'src/models.ts',
            line: 4,
            snippet: 'export type ZebraAlias = string | number;'
          }
        ]
      });
    } finally {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });
});
