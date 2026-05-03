import { describe, expect, it } from 'vitest';

import { executePlugins, loadPlugins } from '../../../src/rules/plugin-loader.js';
import type { PluginInput } from '../../../src/rules/plugin-loader.js';

describe('plugin example fixture', () => {
  it('loads and executes the example plugin without crashing', async () => {
    const { plugins, warnings } = await loadPlugins(['tests/fixtures/plugins/custom-rule.js']);

    expect(warnings).toEqual([]);
    expect(plugins).toHaveLength(1);

    const findings = await executePlugins(plugins, fixtureInput());

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id.startsWith('plugin:custom-rule:')).toBe(true);
    expect(findings[0]).toMatchObject({
      id: 'plugin:custom-rule:temp-file',
      summary: 'Temp file found: src/TODO-cleanup.ts',
      severity: 'low',
      confidence: 'high',
      mappingConfidence: 'medium',
      affectedFiles: ['src/TODO-cleanup.ts'],
      specReferences: [],
    });
  });
});

function fixtureInput(): PluginInput {
  return {
    spec: {
      documents: [],
      parseWarnings: [],
    },
    repository: {
      files: [
        { filePath: 'src/TODO-cleanup.ts', routes: [], models: [], types: [] },
        {
          filePath: 'src/User.ts',
          routes: [],
          models: [
            {
              name: 'User',
              kind: 'interface',
              filePath: 'src/User.ts',
              line: 1,
              snippet: 'export interface User {}',
            },
          ],
          types: [],
        },
      ],
    },
    mappings: [],
  };
}
