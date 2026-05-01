import { z } from 'zod';

export const specPathSchema = z.string();
export type SpecPath = z.infer<typeof specPathSchema>;

export const codePathSchema = z.string();
export type CodePath = z.infer<typeof codePathSchema>;

import { findingSeveritySchema } from './finding.js';

export type { FindingSeverity } from './finding.js';

export const ciConfigSchema = z.object({
  failOn: z.array(findingSeveritySchema).optional(),
  changedOnly: z.boolean().optional(),
  baseRef: z.string().optional(),
  sarif: z.string().optional(),
});
export type CiConfig = z.infer<typeof ciConfigSchema>;

export const resolvedConfigSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
  configFile: z.string().nullable(),
  ci: ciConfigSchema.optional(),
});
export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>;

export const scanInputSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
  changedFiles: z.array(z.string()).optional(),
});
export type ScanInput = z.infer<typeof scanInputSchema>;
