#!/usr/bin/env node

import { Command } from 'commander';
import { executeScan } from './commands/scan.js';
import {
  executeBaselineSave,
  executeBaselineClear,
  executeBaselineList,
} from './commands/baseline.js';
import { executeFoundationCommand } from './commands/foundation.js';

const collectArray = (value: string, previous: string[]): string[] => {
  return [...previous, value];
};

const collectSeverity = (value: string, previous: string[]): string[] => {
  const parts = value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  return [...previous, ...parts];
};

const program = new Command();

program
  .name('driftguard')
  .description('Local-first OpenAPI and Markdown spec-to-code drift detection CLI')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan repository for spec-to-code drift')
  .option('--repo <path>', 'Repository path', '.')
  .option('--spec <path>', 'Spec file or directory (repeatable)', collectArray, [])
  .option('--code <path>', 'Code file or directory (repeatable)', collectArray, [])
  .option('--config <path>', 'Config file path')
  .option('--json', 'Output JSON format')
  .option('--ci', 'Run in CI mode (non-interactive, enables --fail-on)')
  .option('--baseline <name>', 'Compare against named baseline')
  .option('--fail-on <severity>', 'Fail on finding severities (comma-separated or repeatable)', collectSeverity, [])
  .option('--changed-only', 'Only scan git-tracked changed files')
  .option('--base-ref <ref>', 'Git base ref to diff against (used with --changed-only)')
  .option('--since <ref>', 'Compare scan against historical git ref')
  .option('--sarif <path>', 'Write SARIF output to file')
  .option('--foundation-project <id>', 'Foundation project ID')
  .option('--foundation-token <token>', 'Foundation auth token')
  .option('--foundation-url <url>', 'Foundation API URL')
  .option('--write-back', 'Enable write-back to Foundation')
  .option('--plugin <path>', 'Load custom rule plugin (repeatable)', collectArray, [])
  .action(async (options) => {
    try {
      const exitCode = await executeScan(options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

const baseline = program
  .command('baseline')
  .description('Manage drift baselines');

baseline
  .command('save')
  .description('Save current scan findings as a baseline')
  .option('--repo <path>', 'Repository path', '.')
  .option('--spec <path>', 'Spec file or directory (repeatable)', collectArray, [])
  .option('--code <path>', 'Code file or directory (repeatable)', collectArray, [])
  .option('--name <name>', 'Baseline name', 'default')
  .action(async (options) => {
    try {
      const exitCode = await executeBaselineSave(options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

baseline
  .command('clear')
  .description('Delete a saved baseline')
  .option('--repo <path>', 'Repository path', '.')
  .option('--name <name>', 'Baseline name', 'default')
  .action(async (options) => {
    try {
      const exitCode = await executeBaselineClear(options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

baseline
  .command('list')
  .description('List saved baselines')
  .option('--repo <path>', 'Repository path', '.')
  .action(async (options) => {
    try {
      const exitCode = await executeBaselineList(options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

const foundation = program
  .command('foundation')
  .description('Manage Foundation integration');

foundation
  .command('auth')
  .description('Configure Foundation authentication')
  .option('--token <token>', 'Foundation auth token')
  .option('--foundation-url <url>', 'Foundation API URL')
  .action(async (options) => {
    try {
      const exitCode = await executeFoundationCommand('auth', options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

foundation
  .command('projects')
  .description('List Foundation projects')
  .option('--token <token>', 'Foundation auth token')
  .option('--foundation-url <url>', 'Foundation API URL')
  .action(async (options) => {
    try {
      const exitCode = await executeFoundationCommand('projects', options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

foundation
  .command('select')
  .description('Select a Foundation project for this repository')
  .option('--project-id <id>', 'Foundation project ID')
  .option('--repo <path>', 'Repository path', '.')
  .action(async (options) => {
    try {
      const exitCode = await executeFoundationCommand('select', options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

foundation
  .command('clear')
  .description('Clear the stored Foundation project mapping')
  .option('--repo <path>', 'Repository path', '.')
  .action(async (options) => {
    try {
      const exitCode = await executeFoundationCommand('clear', options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

foundation
  .command('sync')
  .description('Sync data with Foundation')
  .action(async (options) => {
    try {
      const exitCode = await executeFoundationCommand('sync', options, {
        stdout: (msg) => process.stdout.write(msg + '\n'),
        stderr: (msg) => process.stderr.write(msg + '\n'),
      });
      process.exitCode = exitCode;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      process.stderr.write(message + '\n');
      process.exit(2);
    }
  });

program.parse(process.argv);
