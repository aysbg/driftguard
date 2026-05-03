import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { executePlugins, loadPlugins } from '../../../src/rules/plugin-loader.js';
import type { PluginInput } from '../../../src/rules/plugin-loader.js';

describe('loadPlugins', () => {
  it('loads a valid local ESM plugin and executes its findings', async () => {
    await withPluginDir(async (dir) => {
      const pluginPath = join(dir, 'custom-rule.mjs');
      await writeFile(
        pluginPath,
        `export function run(input) {
          return input.repository.files
            .filter((file) => file.filePath.startsWith('src/temp-'))
            .map((file) => ({
              id: 'temp-found',
              summary: 'Temp file found: ' + file.filePath,
              severity: 'low',
              confidence: 'high',
              affectedFiles: [file.filePath],
              specReferences: ['docs/spec.md'],
            }));
        }`,
      );

      const { plugins, warnings } = await loadPlugins([pluginPath]);
      const findings = await executePlugins(plugins, pluginInput());

      expect(warnings).toEqual([]);
      expect(plugins).toHaveLength(1);
      expect(findings).toEqual([
        {
          id: 'plugin:custom-rule:temp-found',
          summary: 'Temp file found: src/temp-user.ts',
          severity: 'low',
          confidence: 'high',
          mappingConfidence: 'medium',
          affectedFiles: ['src/temp-user.ts'],
          specReferences: ['docs/spec.md'],
        },
      ]);
    });
  });

  it('returns a warning and skips an invalid plugin missing a run export', async () => {
    await withPluginDir(async (dir) => {
      const pluginPath = join(dir, 'invalid-plugin.mjs');
      await writeFile(pluginPath, 'export const name = "invalid";');

      const result = await loadPlugins([pluginPath]);

      expect(result.plugins).toEqual([]);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.filePath).toBe(pluginPath);
      expect(result.warnings[0]?.message).toContain('run');
    });
  });
});

describe('executePlugins', () => {
  it('keeps scanning when one plugin throws', async () => {
    const findings = await executePlugins(
      [
        {
          path: '/plugins/broken.mjs',
          run: () => {
            throw new Error('plugin exploded');
          },
        },
        {
          path: '/plugins/working.mjs',
          run: () => [
            {
              id: 'ok',
              summary: 'Working plugin finding',
              severity: 'medium',
              confidence: 'medium',
            },
          ],
        },
      ],
      pluginInput(),
    );

    expect(findings).toEqual([
      {
        id: 'plugin:working:ok',
        summary: 'Working plugin finding',
        severity: 'medium',
        confidence: 'medium',
        mappingConfidence: 'medium',
        affectedFiles: [],
        specReferences: [],
      },
    ]);
  });

  it('sorts plugin findings by namespaced id', async () => {
    const findings = await executePlugins(
      [
        {
          path: '/plugins/z-rule.mjs',
          run: () => [
            {
              id: 'z-last',
              summary: 'Last',
              severity: 'low',
              confidence: 'low',
            },
          ],
        },
        {
          path: '/plugins/a-rule.mjs',
          run: () => [
            {
              id: 'a-first',
              summary: 'First',
              severity: 'high',
              confidence: 'high',
            },
          ],
        },
      ],
      pluginInput(),
    );

    expect(findings.map((finding) => finding.id)).toEqual([
      'plugin:a-rule:a-first',
      'plugin:z-rule:z-last',
    ]);
  });
});

async function withPluginDir(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'driftguard-plugin-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function pluginInput(): PluginInput {
  return {
    spec: {
      documents: [],
      parseWarnings: [],
    },
    repository: {
      files: [
        {
          filePath: 'src/temp-user.ts',
          routes: [],
        },
      ],
    },
    mappings: [],
  };
}
