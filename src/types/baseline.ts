import { z } from 'zod';
import { findingSeveritySchema, blastRadiusSchema } from './finding.js';

export const baselineFindingSchema = z.object({
  id: z.string(),
  severity: findingSeveritySchema,
  blastRadius: blastRadiusSchema.optional(),
  summary: z.string(),
  affectedFiles: z.array(z.string()),
  specReferences: z.array(z.string()),
});
export type BaselineFinding = z.infer<typeof baselineFindingSchema>;

export const baselineFileSchema = z.object({
  formatVersion: z.number().int().positive(),
  name: z.string(),
  createdAt: z.string(),
  repoPath: z.string(),
  commitSha: z.string().optional(),
  findings: z.array(baselineFindingSchema),
});
export type BaselineFile = z.infer<typeof baselineFileSchema>;

export const baselineComparisonStatusSchema = z.enum([
  'new',
  'persisted',
  'resolved',
  'worsened',
]);
export type BaselineComparisonStatus = z.infer<
  typeof baselineComparisonStatusSchema
>;

export const baselineComparisonResultSchema = z.object({
  status: baselineComparisonStatusSchema,
  finding: baselineFindingSchema,
  previousFinding: baselineFindingSchema.optional(),
});
export type BaselineComparisonResult = z.infer<
  typeof baselineComparisonResultSchema
>;
