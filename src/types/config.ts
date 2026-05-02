import { z } from 'zod';

export const specPathSchema = z.string();
export type SpecPath = z.infer<typeof specPathSchema>;

export const codePathSchema = z.string();
export type CodePath = z.infer<typeof codePathSchema>;

import { findingSeveritySchema } from './finding.js';

export type { FindingSeverity } from './finding.js';

export const thresholdsSchema = z.object({
  maxFindings: z.number().int().nonnegative().optional(),
  maxNewFindings: z.number().int().nonnegative().optional(),
  failOnNewOnly: z.boolean().optional(),
});
export type Thresholds = z.infer<typeof thresholdsSchema>;

export const ciConfigSchema = z.object({
  failOn: z.array(findingSeveritySchema).optional(),
  changedOnly: z.boolean().optional(),
  baseRef: z.string().optional(),
  sarif: z.string().optional(),
  thresholds: thresholdsSchema.optional(),
});
export type CiConfig = z.infer<typeof ciConfigSchema>;

export const foundationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  apiUrl: z.string().optional(),
  projectId: z.string().optional(),
  authToken: z.string().optional(),
  writeBack: z.boolean().optional(),
});
export type FoundationConfig = z.infer<typeof foundationConfigSchema>;

export const resolvedConfigSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
  configFile: z.string().nullable(),
  baseline: z.string().optional(),
  ci: ciConfigSchema.optional(),
  foundation: foundationConfigSchema.optional(),
});
export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>;

export const scanInputSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
  changedFiles: z.array(z.string()).optional(),
  baseline: z.string().optional(),
  foundationConfig: foundationConfigSchema.optional(),
});
export type ScanInput = z.infer<typeof scanInputSchema>;
