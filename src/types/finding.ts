import { z } from 'zod';
import type { SpecSection } from './spec.js';

export type MappingConfidence = 'medium' | 'low';

export interface SpecCitation {
  filePath: string;
  sectionOrOperation?: string;
  startLine?: number;
  endLine?: number;
}

export const specCitationSchema = z.object({
  filePath: z.string(),
  sectionOrOperation: z.string().optional(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
});

export interface CodeEvidence {
  filePath: string;
  startLine?: number;
  endLine?: number;
  snippet?: string;
}

export const codeEvidenceSchema = z.object({
  filePath: z.string(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
  snippet: z.string().optional(),
});

export interface Explanation {
  expected?: string;
  found?: string;
  reason?: string;
}

export const explanationSchema = z.object({
  expected: z.string().optional(),
  found: z.string().optional(),
  reason: z.string().optional(),
});

export interface Mapping {
  specOperation: {
    filePath: string;
    method: string;
    path: string;
  };
  codeRoute: {
    filePath: string;
    method: string;
    path: string;
  } | null;
  confidence: MappingConfidence;
  specCitation?: SpecCitation;
  codeEvidence?: CodeEvidence;
}

export interface SectionMapping {
  section: SpecSection;
  matchedFiles: string[];
  confidence: MappingConfidence;
}

export const findingSeveritySchema = z.enum(['high', 'medium', 'low']);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;
export type FindingConfidence = 'high' | 'medium' | 'low';

export const driftFindingSchema = z.object({
  id: z.string(),
  summary: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  confidence: z.enum(['high', 'medium', 'low']),
  mappingConfidence: z.enum(['medium', 'low']),
  method: z.string().optional(),
  path: z.string().optional(),
  affectedFiles: z.array(z.string()),
  specReferences: z.array(z.string()),
  specCitations: z.array(specCitationSchema).optional(),
  codeEvidence: z.array(codeEvidenceSchema).optional(),
  explanation: explanationSchema.optional(),
});

export interface DriftFinding extends z.infer<typeof driftFindingSchema> {}
