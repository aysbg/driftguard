import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { DriftFinding, Mapping } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';
import type { ParseWarning, UnifiedSpecIR } from '../types/spec.js';

export interface PluginInput {
  spec: UnifiedSpecIR;
  repository: RepositoryIndex;
  mappings: Mapping[];
}

export interface PluginFinding {
  id: string;
  summary: string;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  affectedFiles?: string[];
  specReferences?: string[];
}

export interface LoadedPlugin {
  path: string;
  run: (input: PluginInput) => Promise<PluginFinding[]> | PluginFinding[];
}

export async function loadPlugins(
  pluginPaths: string[],
): Promise<{ plugins: LoadedPlugin[]; warnings: ParseWarning[] }> {
  const plugins: LoadedPlugin[] = [];
  const warnings: ParseWarning[] = [];

  for (const pluginPath of pluginPaths) {
    try {
      await stat(pluginPath);
      const resolvedPath = resolve(pluginPath);
      const module = (await import(pathToFileURL(resolvedPath).href)) as { run?: unknown };

      if (typeof module.run !== 'function') {
        throw new Error('Plugin must export a run function');
      }

      plugins.push({
        path: pluginPath,
        run: module.run as LoadedPlugin['run'],
      });
    } catch (error) {
      warnings.push({
        filePath: pluginPath,
        message: errorMessage(error),
      });
    }
  }

  return { plugins, warnings };
}

export async function executePlugins(
  plugins: LoadedPlugin[],
  input: PluginInput,
): Promise<DriftFinding[]> {
  const findings: DriftFinding[] = [];

  for (const plugin of plugins) {
    try {
      const pluginFindings = await plugin.run(input);
      findings.push(
        ...pluginFindings.map((finding) => ({
          id: `plugin:${pathSlug(plugin.path)}:${finding.id}`,
          summary: finding.summary,
          severity: finding.severity,
          confidence: finding.confidence,
          mappingConfidence: 'medium' as const,
          affectedFiles: finding.affectedFiles ?? [],
          specReferences: finding.specReferences ?? [],
        })),
      );
    } catch {
      // Plugin failures are isolated so one bad plugin cannot stop the scan.
    }
  }

  return findings.sort((left, right) => left.id.localeCompare(right.id));
}

function pathSlug(pluginPath: string): string {
  return basename(pluginPath).replace(/\.[^.]+$/, '');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
