#!/usr/bin/env node

import { Command } from 'commander';
import { executeScan } from './commands/scan.js';

const collectArray = (value: string, previous: string[]): string[] => {
  return [...previous, value];
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
  .action(async (options) => {
    const exitCode = await executeScan(options, {
      stdout: (msg) => process.stdout.write(msg + '\n'),
      stderr: (msg) => process.stderr.write(msg + '\n'),
    });
    process.exitCode = exitCode;
  });

program.parse(process.argv);