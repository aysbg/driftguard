import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { FoundationMcpClient } from './client-interface.js';
import type {
  FoundationDeviationReport,
  FoundationProject,
  FoundationSpec,
} from './types.js';
import { DriftGuardError, ExitCode } from '../errors.js';
import { redactToken } from './auth.js';

export class FoundationMcpClientImpl implements FoundationMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private currentToken: string | undefined;
  private crashed = false;

  async connect(token: string, apiUrl?: string): Promise<void> {
    this.currentToken = token;
    this.crashed = false;

    const env: Record<string, string> = {
      ...Object.entries(process.env).reduce<Record<string, string>>((acc, [k, v]) => {
        if (v !== undefined) acc[k] = v;
        return acc;
      }, {}),
      FOUNDATION_TOKEN: token,
    };
    if (apiUrl) {
      env.FOUNDATION_API_URL = apiUrl;
    }

    this.transport = new StdioClientTransport({
      command: 'foundationworks-mcp',
      args: [],
      env,
      stderr: 'pipe',
    });

    this.transport.onclose = () => {
      this.crashed = true;
    };
    this.transport.onerror = () => {
      this.crashed = true;
    };

    this.client = new Client({ name: 'driftguard', version: '0.1.0' });

    try {
      await Promise.race([
        (async () => {
          await this.client!.connect(this.transport!);
          const toolsResult = await this.client!.listTools();
          const hasFoundation = toolsResult.tools.some((t) =>
            t.name.startsWith('foundation_'),
          );
          if (!hasFoundation) {
            throw new Error('no foundation tools found');
          }
        })(),
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error('Connection timed out')),
            10000,
          ),
        ),
      ]);
    } catch (error) {
      await this.cleanup();
      const rawMessage =
        error instanceof Error ? error.message : String(error);
      const message = redactToken(rawMessage, token);
      if (
        message.toLowerCase().includes('auth') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('401')
      ) {
        throw new DriftGuardError(
          `Foundation authentication failed: ${message}`,
          ExitCode.ExecutionError,
        );
      }
      throw new DriftGuardError(
        `Foundation MCP server connection failed: ${message}`,
        ExitCode.ExecutionError,
      );
    }
  }

  async disconnect(): Promise<void> {
    await this.cleanup();
  }

  async listProjects(): Promise<FoundationProject[]> {
    this.ensureConnected();
    try {
      const result = await this.client!.callTool({
        name: 'foundation_search',
        arguments: {},
      });
      return this.parseToolResult<FoundationProject[]>(result, 'foundation_search');
    } catch (error) {
      throw this.wrapToolError(error, 'listProjects');
    }
  }

  async fetchSpecs(projectId: string): Promise<FoundationSpec[]> {
    this.ensureConnected();
    try {
      const result = await this.client!.callTool({
        name: 'foundation_fetch',
        arguments: {
          projectId,
          sections: 'epics,project_specifics,tech_stack_decisions',
        },
      });
      return this.parseToolResult<FoundationSpec[]>(result, 'foundation_fetch');
    } catch (error) {
      throw this.wrapToolError(error, 'fetchSpecs');
    }
  }

  async postDeviationReport(
    projectId: string,
    reports: FoundationDeviationReport[],
  ): Promise<void> {
    this.ensureConnected();
    try {
      await this.client!.callTool({
        name: 'foundation_comment',
        arguments: {
          projectId,
          reports,
        },
      });
    } catch (error) {
      throw this.wrapToolError(error, 'postDeviationReport');
    }
  }

  private ensureConnected(): void {
    if (!this.client || !this.transport) {
      throw new DriftGuardError(
        'Foundation MCP server connection failed: not connected',
        ExitCode.ExecutionError,
      );
    }
  }

  private async cleanup(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // best-effort cleanup
      }
      this.client = null;
    }

    if (this.transport) {
      const pid = this.transport.pid;
      try {
        await this.transport.close();
      } catch {
        // best-effort cleanup
      }
      if (typeof pid === 'number') {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // best-effort cleanup
        }
      }
      this.transport = null;
    }

    this.currentToken = undefined;
    this.crashed = false;
  }

  private parseToolResult<T>(result: unknown, toolName: string): T {
    if (result && typeof result === 'object') {
      const obj = result as Record<string, unknown>;

      if ('structuredContent' in obj && obj.structuredContent !== undefined) {
        return obj.structuredContent as T;
      }

      if ('content' in obj && Array.isArray(obj.content)) {
        const contents = obj.content as Array<{
          type?: string;
          text?: string;
        }>;
        const textParts = contents
          .filter((item) => item.type === 'text' && typeof item.text === 'string')
          .map((item) => item.text)
          .join('');
        if (textParts) {
          try {
            return JSON.parse(textParts) as T;
          } catch {
            return textParts as unknown as T;
          }
        }
      }

      if ('toolResult' in obj && obj.toolResult !== undefined) {
        return obj.toolResult as T;
      }
    }

    throw new DriftGuardError(
      `Foundation tool error (${toolName}): unexpected response`,
      ExitCode.ExecutionError,
    );
  }

  private wrapToolError(error: unknown, context: string): never {
    if (this.crashed) {
      throw new DriftGuardError(
        'Foundation MCP server crashed',
        ExitCode.ExecutionError,
      );
    }

    const rawMessage =
      error instanceof Error ? error.message : String(error);
    const message = redactToken(rawMessage, this.currentToken);
    throw new DriftGuardError(
      `Foundation tool error (${context}): ${message}`,
      ExitCode.ExecutionError,
    );
  }
}
