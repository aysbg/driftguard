import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

export async function runCli(args: string[]): Promise<CliResult> {
  const cliPath = resolve('dist/cli.js');
  return new Promise((resolve) => {
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        status: code ?? 0,
        stdout,
        stderr,
      });
    });

    child.on('error', (err) => {
      resolve({
        status: 1,
        stdout,
        stderr: stderr + err.message,
      });
    });
  });
}