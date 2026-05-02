import type { FoundationMcpClient } from './client-interface.js';
import type { SpecDocument, UnifiedSpecIR } from '../types/spec.js';
import { extractMarkdownSections } from '../ingestion/markdown.js';
import { extractOpenApiOperations } from '../ingestion/openapi.js';
import { detectAdrDocuments, extractAdrDocuments } from '../ingestion/adr.js';

export type SpecFormat = 'openapi' | 'markdown' | 'unknown';

export function detectSpecFormat(format: string): SpecFormat {
  const normalized = format.trim().toLowerCase();
  if (normalized === 'openapi' || normalized === 'openapi_v3' || normalized === 'swagger') {
    return 'openapi';
  }
  if (normalized === 'markdown' || normalized === 'md') {
    return 'markdown';
  }
  return 'unknown';
}

export async function fetchFoundationSpecs(
  client: FoundationMcpClient,
  projectId: string,
): Promise<UnifiedSpecIR> {
  // Verify access by listing projects first
  await client.listProjects();

  const specs = await client.fetchSpecs(projectId);
  const parseWarnings: UnifiedSpecIR['parseWarnings'] = [];
  if (specs.length === 0) {
    parseWarnings.push({ filePath: 'foundation://' + projectId, message: 'Foundation returned no specs for project ' + projectId });
    return { documents: [], parseWarnings };
  }

  const documents: SpecDocument[] = [];

  for (const spec of specs) {
    const filePath = `foundation://${projectId}/${spec.id}`;
    const format = detectSpecFormat(spec.format);

    try {
      if (format === 'openapi') {
        documents.push({
          filePath,
          sections: [],
          operations: extractOpenApiOperations(filePath, spec.content),
          source: 'foundation',
        });
      } else if (format === 'markdown') {
        if (detectAdrDocuments(filePath, spec.content)) {
          documents.push(...extractAdrDocuments(filePath, spec.content));
        } else {
          documents.push({
            filePath,
            sections: extractMarkdownSections(filePath, spec.content),
            operations: [],
            source: 'foundation',
          });
        }
      } else {
        parseWarnings.push({
          filePath,
          message: `Unrecognized Foundation spec format "${spec.format}"; skipping`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      parseWarnings.push({ filePath, message });
    }
  }

  return { documents, parseWarnings };
}
