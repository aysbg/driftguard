import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { resolve } from 'node:path';

describe('action metadata validation', () => {
  const actionYmlPath = resolve(__dirname, '../../.github/actions/driftguard/action.yml');
  const actionContent = readFileSync(actionYmlPath, 'utf-8');
  const action = parse(actionContent);

  const requiredInputs = [
    'spec',
    'code',
    'fail-on',
    'sarif',
    'baseline',
    'foundation-mcp',
    'foundation-token',
    'foundation-url',
  ];

  const requiredOutputs = ['exit-code', 'sarif-path'];

  describe('action inputs', () => {
    it('should have inputs defined', () => {
      expect(action.inputs).toBeDefined();
    });

    it('should have all required inputs', () => {
      for (const input of requiredInputs) {
        expect(action.inputs[input], `input '${input}' should exist`).toBeDefined();
      }
    });

    it('should have foundation-token with mask-input: true', () => {
      expect(action.inputs['foundation-token']).toBeDefined();
      expect(action.inputs['foundation-token']['mask-input']).toBe(true);
    });

    it('should have correct default for spec input', () => {
      expect(action.inputs['spec'].default).toBe('docs');
    });

    it('should have correct default for code input', () => {
      expect(action.inputs['code'].default).toBe('src');
    });

    it('should have correct default for fail-on input', () => {
      expect(action.inputs['fail-on'].default).toBe('high');
    });

    it('should have correct default for changed-only input', () => {
      expect(action.inputs['changed-only'].default).toBe(false);
    });

    it('should have correct default for base-ref input', () => {
      expect(action.inputs['base-ref'].default).toBe('origin/main');
    });

    it('should have correct default for node-version input', () => {
      expect(action.inputs['node-version'].default).toBe('22');
    });

    it('should have correct default for install-command input', () => {
      expect(action.inputs['install-command'].default).toContain('npm install');
    });

    it('should have all action inputs present', () => {
      const allInputs = [
        'spec', 'code', 'fail-on', 'sarif', 'baseline',
        'foundation-mcp', 'foundation-token', 'foundation-url',
        'changed-only', 'base-ref', 'node-version', 'install-command',
      ];
      for (const input of allInputs) {
        expect(action.inputs[input], `input '${input}' should exist`).toBeDefined();
      }
    });
  });

  describe('action outputs', () => {
    it('should have outputs defined', () => {
      expect(action.outputs).toBeDefined();
    });

    it('should have all required outputs', () => {
      for (const output of requiredOutputs) {
        expect(action.outputs[output], `output '${output}' should exist`).toBeDefined();
      }
    });
  });

  describe('action runs configuration', () => {
    it('should use composite run type', () => {
      expect(action.runs.using).toBe('composite');
    });

    it('should have at least one run step', () => {
      expect(action.runs.steps).toBeDefined();
      expect(action.runs.steps.length).toBeGreaterThan(0);
    });

    it('should contain driftguard scan in run steps', () => {
      const runSteps = action.runs.steps.filter((step: { run?: string }) => step.run);
      const hasDriftguardScan = runSteps.some((step: { run: string }) =>
        step.run.includes('driftguard scan'),
      );
      expect(hasDriftguardScan).toBe(true);
    });

    it('should setup Node.js in steps', () => {
      const setupStep = action.runs.steps.find((step: { uses?: string }) =>
        step.uses?.includes('actions/setup-node'),
      );
      expect(setupStep).toBeDefined();
    });
  });
});