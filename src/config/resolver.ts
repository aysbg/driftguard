import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse } from 'yaml';
import { z } from 'zod';

import { DriftGuardError, ExitCode } from '../errors.js';
import type { ResolvedConfig } from '../types/config.js';

const DEFAULT_SPEC_PATHS = ['docs'];
const DEFAULT_CODE_PATHS = ['src'];

const configSchema = z
  .object({
    spec: z.array(z.string()).optional(),
    code: z.array(z.string()).optional(),
    output: z.object({ json: z.string().optional() }).optional(),
    report: z.object({ format: z.string().optional() }).optional(),
  })
  .passthrough();

export interface ScanCliOptions {
  repo?: string;
  spec?: string[];
  code?: string[];
  config?: string;
}

export interface ResolveConfigContext {
  cwd?: string;
}

export async function resolveConfig(
  options: ScanCliOptions,
  context: ResolveConfigContext = {},
): Promise<ResolvedConfig> {
  const cwd = context.cwd ?? process.cwd();
  const repo = resolve(cwd, options.repo ?? '.');
  const explicitConfigPath = options.config ? resolve(cwd, options.config) : null;
  const discoveredConfigPath = resolve(repo, '.driftguard.yml');
  const configPath = explicitConfigPath ?? discoveredConfigPath;
  const fileConfig = await loadConfig(configPath, explicitConfigPath !== null);

  const configFile = fileConfig ? configPath : null;
  const configSpec = fileConfig?.spec
    ? normalizeConfigPaths(fileConfig.spec, 'spec', repo)
    : undefined;
  const configCode = fileConfig?.code
    ? normalizeConfigPaths(fileConfig.code, 'code', repo)
    : undefined;

  const spec = hasCliPaths(options.spec)
    ? normalizePaths(options.spec, repo)
    : (configSpec ?? normalizePaths(DEFAULT_SPEC_PATHS, repo));

  const code = hasCliPaths(options.code)
    ? normalizePaths(options.code, repo)
    : (configCode ?? normalizePaths(DEFAULT_CODE_PATHS, repo));

  return {
    repo,
    spec,
    code,
    configFile,
  };
}

function hasCliPaths(paths: string[] | undefined): paths is string[] {
  return Array.isArray(paths) && paths.length > 0;
}

function normalizePaths(paths: string[], basePath: string): string[] {
  return paths.map((path) => resolve(basePath, path));
}

function normalizeConfigPaths(paths: string[], field: 'spec' | 'code', repo: string): string[] {
  for (const path of paths) {
    if (containsGlobSyntax(path)) {
      throw new DriftGuardError(
        `${field} config path contains unsupported glob syntax: ${path}`,
        ExitCode.ExecutionError,
      );
    }
  }

  return normalizePaths(paths, repo);
}

function containsGlobSyntax(path: string): boolean {
  return /[*?[\]{}]/.test(path);
}

async function loadConfig(
  configPath: string,
  explicitConfig: boolean,
): Promise<z.infer<typeof configSchema> | null> {
  let rawConfig: string;

  try {
    rawConfig = await readFile(configPath, 'utf8');
  } catch (error) {
    if (!explicitConfig && isMissingPathError(error)) {
      return null;
    }

    throw toConfigError(error, configPath, explicitConfig);
  }

  try {
    return configSchema.parse(parse(rawConfig) ?? {});
  } catch (error) {
    if (error instanceof DriftGuardError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Invalid config file';
    throw new DriftGuardError(
      `config file is invalid: ${configPath} (${message})`,
      ExitCode.ExecutionError,
    );
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function toConfigError(
  error: unknown,
  configPath: string,
  explicitConfig: boolean,
): DriftGuardError {
  if (isMissingPathError(error)) {
    const label = explicitConfig ? 'config file does not exist' : 'config file is missing';
    return new DriftGuardError(`${label}: ${configPath}`, ExitCode.ExecutionError);
  }

  const message = error instanceof Error ? error.message : 'Unknown config read failure';
  return new DriftGuardError(
    `config file is unreadable: ${configPath} (${message})`,
    ExitCode.ExecutionError,
  );
}
