import { describe, expect, it } from 'vitest';

import { evaluateDataModelExists } from '../../../src/rules/data-model-exists.js';
import type { IndexedModel } from '../../../src/types/repository.js';
import type { DataModel } from '../../../src/types/spec.js';

describe('evaluateDataModelExists', () => {
  it('returns no findings when a spec model matches a code interface', () => {
    expect(evaluateDataModelExists([dataModel('User')], [codeModel('User', 'interface')])).toEqual([]);
  });

  it('returns no findings when a spec model matches a code type alias', () => {
    expect(evaluateDataModelExists([dataModel('User')], [codeModel('User', 'type_alias')])).toEqual([]);
  });

  it('emits a finding when a spec model has no matching code model', () => {
    expect(evaluateDataModelExists([dataModel('User')], [])).toEqual([
      {
        id: 'data-model-exists:User|specs/models.yml',
        summary: "Data model 'User' is declared in spec but not found in code",
        severity: 'high',
        confidence: 'high',
        mappingConfidence: 'medium',
        affectedFiles: ['specs/models.yml'],
        specReferences: ['specs/models.yml'],
        explanation: {
          expected: 'TypeScript interface or type alias declaration',
          found: 'no matching declaration in code',
          reason: 'Data model exists in spec but is not implemented in code',
        },
      },
    ]);
  });

  it('emits exactly one finding for the missing model among multiple models', () => {
    const findings = evaluateDataModelExists(
      [dataModel('User'), dataModel('Order')],
      [codeModel('User', 'interface')],
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.id).toBe('data-model-exists:Order|specs/models.yml');
  });

  it('uses high severity for missing data model findings', () => {
    const findings = evaluateDataModelExists([dataModel('User')], []);

    expect(findings[0]?.severity).toBe('high');
  });
});

function dataModel(name: string): DataModel {
  return {
    name,
    filePath: 'specs/models.yml',
    properties: [],
    source: 'local',
  };
}

function codeModel(name: string, kind: IndexedModel['kind']): IndexedModel {
  return {
    name,
    kind,
    filePath: 'src/models.ts',
    line: 1,
    snippet: `export interface ${name} {}`,
  };
}
