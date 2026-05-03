/**
 * Plugin API type definitions for DriftGuard.
 *
 * Plugin authors can implement the `Plugin` interface to add custom drift detection rules.
 * Plugins receive the current spec IR, repository index, and existing mappings, then return
 * findings for any drift they detect.
 *
 * @example
 * ```typescript
 * import type { Plugin, PluginInput, PluginFinding } from 'driftguard';
 *
 * export const myPlugin: Plugin = {
 *   run(input: PluginInput): PluginFinding[] {
 *     // Analyze input.spec, input.repository, input.mappings
 *     return [];
 *   }
 * };
 * ```
 */

import type { Mapping } from '../types/finding.js';
import type { RepositoryIndex } from '../types/repository.js';
import type { UnifiedSpecIR } from '../types/spec.js';

/**
 * Input passed to a plugin's `run` function.
 * Contains the parsed OpenAPI/Markdown spec IR, indexed repository, and existing mappings.
 */
export interface PluginInput {
  /**
   * The unified intermediate representation of all parsed spec documents.
   * Use `documents` to iterate over OpenAPI and Markdown specs.
   */
  spec: UnifiedSpecIR;

  /**
   * The indexed repository containing discovered routes and models.
   * Use `files` to get all indexed code files with their routes/models.
   */
  repository: RepositoryIndex;

  /**
   * Existing mappings between spec operations and code routes.
   * Plugins can analyze these to understand current coverage or find gaps.
   */
  mappings: Mapping[];
}

/**
 * A finding returned by a plugin's `run` function.
 * Represents a piece of drift or issue detected by the plugin.
 */
export interface PluginFinding {
  /**
   * Unique identifier for this finding.
   * Use a namespaced format like `plugin-name:issue-type` for clarity.
   */
  id: string;

  /**
   * Short human-readable summary of the finding.
   */
  summary: string;

  /**
   * Impact level of the finding.
   * - `high`: Critical issue requiring immediate attention (e.g., missing route implementation)
   * - `medium`: Moderate issue that should be addressed (e.g., partial implementation)
   * - `low`: Minor issue or suggestion (e.g., missing summary, optional field drift)
   */
  severity: 'high' | 'medium' | 'low';

  /**
   * Confidence that this finding accurately represents real drift.
   * - `high`: Strong evidence supports the finding
   * - `medium`: Some evidence, but may need manual review
   * - `low`: Heuristic-based, likely but uncertain
   */
  confidence: 'high' | 'medium' | 'low';

  /**
   * Optional list of code file paths affected by this finding.
   * Helps authors understand which files need changes.
   */
  affectedFiles?: string[];

  /**
   * Optional list of spec file paths related to this finding.
   * Useful for tracing the finding back to documentation.
   */
  specReferences?: string[];
}

/**
 * The plugin interface that all DriftGuard plugins must implement.
 * Return a promise if your plugin performs async work (e.g., file I/O, network calls).
 */
export interface Plugin {
  /**
   * Analyze the input and return any findings.
   *
   * @param input - The plugin input containing spec, repository, and mappings
   * @returns An array of findings, or a promise resolving to findings for async plugins
   */
  run(input: PluginInput): Promise<PluginFinding[]> | PluginFinding[];
}

/**
 * A loaded plugin instance with its file path and run function.
 * Used internally by the plugin loader to manage loaded plugins.
 */
export interface LoadedPlugin {
  /**
   * Absolute path to the loaded plugin file.
   */
  path: string;

  /**
   * The plugin's run function.
   */
  run: Plugin['run'];
}