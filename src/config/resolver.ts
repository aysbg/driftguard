import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parse } from 'yaml';
import { z } from 'zod';

import { DriftGuardError, ExitCode } from '../errors.js';
import type { ResolvedConfig, FindingSeverity } from '../types/config.js';

const DEFAULT_SPEC_PATHS = ['docs'];
const DEFAULT_CODE_PATHS = ['src'];
const VALID_SEVERITIES: readonly FindingSeverity[] = ['high', 'medium', 'low'];

const configSchema = z
  .object({
    spec: z.array(z.string()).optional(),
    code: z.array(z.string()).optional(),
    since: z.string().optional(),
    plugins: z.array(z.string()).optional(),
    baseline: z.string().optional(),
    output: z.object({ json: z.string().optional() }).optional(),
    report: z.object({ format: z.string().optional() }).optional(),
    ci: z.object({
      failOn: z.union([z.string(), z.array(z.string())]).optional(),
      changedOnly: z.boolean().optional(),
      baseRef: z.string().optional(),
      sarif: z.string().optional(),
      thresholds: z.object({
        maxFindings: z.number().int().nonnegative().optional(),
        maxNewFindings: z.number().int().nonnegative().optional(),
        failOnNewOnly: z.boolean().optional(),
      }).optional(),
    }).optional(),
    foundation: z.object({
      enabled: z.boolean().optional(),
      apiUrl: z.string().optional(),
      projectId: z.string().optional(),
      authToken: z.string().optional(),
      writeBack: z.boolean().optional(),
    }).optional(),
  })
  .passthrough();

export interface ScanCliOptions {
  repo?: string;
  spec?: string[];
  code?: string[];
  since?: string;
  plugin?: string[];
  plugins?: string[];
  baseline?: string;
  config?: string;
}

export interface ResolveConfigContext {
  cwd?: string;
}

import { loadFoundationMapping } from '../foundation/project-store.js';

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

  const ci = fileConfig?.ci ? parseCiConfig(fileConfig.ci) : undefined;
  const foundation = parseFoundationConfig(fileConfig?.foundation, options);

  if (foundation?.enabled === true && !foundation.projectId) {
    const mapping = await loadFoundationMapping(repo);
    if (mapping) {
      foundation.projectId = mapping.projectId;
    }
  }

  const plugins = hasCliPaths(options.plugins)
    ? options.plugins
    : hasCliPaths(options.plugin)
      ? options.plugin
      : (fileConfig?.plugins ?? undefined);

  return {
    repo,
    spec,
    code,
    configFile,
    baseline: options.baseline ?? fileConfig?.baseline,
    since: options.since ?? fileConfig?.since,
    plugins,
    ci,
    foundation,
  };
}

function parseFoundationConfig(
  fileConfig: z.infer<typeof configSchema>['foundation'],
  options: ScanCliOptions & { foundationMcp?: string; foundationToken?: string; foundationUrl?: string; writeBack?: boolean },
): ResolvedConfig['foundation'] {
  const base = fileConfig ?? {};
  const cliEnabled = options.foundationMcp !== undefined || options.foundationToken !== undefined;
  const enabled = cliEnabled ? true : base.enabled;
  const apiUrl = options.foundationUrl ?? base.apiUrl;
  const projectId = options.foundationMcp ?? base.projectId;
  const authToken = options.foundationToken ?? base.authToken;
  const writeBack = options.writeBack ?? base.writeBack;

  if (enabled === undefined && projectId === undefined && apiUrl === undefined && authToken === undefined && writeBack === undefined) {
    return undefined;
  }

  return {
    enabled,
    apiUrl,
    projectId,
    authToken,
    writeBack,
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

export function parseFailOn(value: string): FindingSeverity[] {
  if (value.trim() === '') {
    throw new DriftGuardError(
      `fail-on must be one or more of: ${VALID_SEVERITIES.join(', ')}`,
      ExitCode.ExecutionError,
    );
  }

  const parts = value.split(',').map((s) => s.trim());
  const result = new Set<FindingSeverity>();
  const seen = new Set<string>();

  for (const part of parts) {
    if (part === '') continue;
    if (seen.has(part)) continue;
    seen.add(part);

    if (!VALID_SEVERITIES.includes(part as FindingSeverity)) {
      const suggestion = part !== part.toLowerCase()
        ? ` (did you mean ${part.toLowerCase()}?)`
        : '';
      throw new DriftGuardError(
        `invalid severity level "${part}". Valid values are: ${VALID_SEVERITIES.join(', ')}${suggestion}`,
        ExitCode.ExecutionError,
      );
    }

    result.add(part as FindingSeverity);
  }

  return [...result].sort((a, b) => VALID_SEVERITIES.indexOf(a) - VALID_SEVERITIES.indexOf(b));
}

function parseCiConfig(raw: z.infer<typeof configSchema>['ci']): ResolvedConfig['ci'] {
  if (!raw) return undefined;

  const failOn = raw.failOn !== undefined
    ? (Array.isArray(raw.failOn)
        ? parseFailOn(raw.failOn.filter((s): s is string => typeof s === 'string').join(','))
        : parseFailOn(raw.failOn))
    : undefined;

  return {
    failOn,
    changedOnly: raw.changedOnly,
    baseRef: raw.baseRef,
    sarif: raw.sarif,
    thresholds: raw.thresholds,
  };
}
