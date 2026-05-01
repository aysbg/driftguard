#!/usr/bin/env node

import { Command } from 'commander';
import { executeScan } from './commands/scan.js';

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
  .option('--fail-on <severity>', 'Fail on finding severities (comma-separated or repeatable)', collectSeverity, [])
  .option('--changed-only', 'Only scan git-tracked changed files')
  .option('--base-ref <ref>', 'Git base ref to diff against (used with --changed-only)')
  .option('--sarif <path>', 'Write SARIF output to file')
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

program.parse(process.argv);