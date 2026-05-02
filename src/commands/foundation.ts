import { resolveFoundationToken } from '../foundation/auth.js';
import type { FoundationMcpClient } from '../foundation/client-interface.js';
import { FoundationMcpClientImpl } from '../foundation/mcp-client.js';
import {
  loadFoundationMapping,
  saveFoundationMapping,
  clearFoundationMapping,
} from '../foundation/project-store.js';

export interface FoundationCommandOptions {
  token?: string;
  projectId?: string;
  apiUrl?: string;
  repo?: string;
}

export async function executeFoundationCommand(
  subcommand: string,
  options: FoundationCommandOptions,
  log: { stdout: (msg: string) => void; stderr: (msg: string) => void },
): Promise<number> {
  const repo = options.repo ?? '.';
  const token = resolveFoundationToken({ token: options.token });

  switch (subcommand) {
    case 'auth': {
      if (!token) {
        log.stderr('No token provided. Set --token or DRIFTGUARD_FOUNDATION_TOKEN.');
        return 2;
      }
      let client: FoundationMcpClient | null = null;
      try {
        client = new FoundationMcpClientImpl();
        await client.connect(token, options.apiUrl);
        log.stdout('Token configured');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.stderr(`Authentication failed: ${message}`);
        return 2;
      } finally {
        await client?.disconnect();
      }
      return 0;
    }
    case 'projects': {
      if (!token) {
        log.stderr('No token provided. Set --token or DRIFTGUARD_FOUNDATION_TOKEN.');
        return 2;
      }
      let client: FoundationMcpClient | null = null;
      try {
        client = new FoundationMcpClientImpl();
        await client.connect(token, options.apiUrl);
        const projects = await client.listProjects();
        if (projects.length === 0) {
          log.stdout('No projects configured');
        } else {
          for (const p of projects) {
            log.stdout(`${p.id}\t${p.name}\t${p.slug}`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.stderr(`Failed to list projects: ${message}`);
        return 2;
      } finally {
        await client?.disconnect();
      }
      return 0;
    }
    case 'select': {
      if (!options.projectId) {
        log.stderr('No project ID provided. Use --project-id <id>.');
        return 2;
      }
      const mapping = await loadFoundationMapping(repo);
      const name = mapping?.name ?? options.projectId;
      await saveFoundationMapping(repo, options.projectId, name);
      log.stdout(`Project ${options.projectId} selected for this repository`);
      return 0;
    }
    case 'clear': {
      await clearFoundationMapping(repo);
      log.stdout('Project mapping cleared');
      return 0;
    }
    case 'sync': {
      log.stdout('Foundation sync not yet implemented');
      return 0;
    }
    default: {
      log.stderr(`Unknown foundation subcommand: ${subcommand}`);
      return 2;
    }
  }
}
