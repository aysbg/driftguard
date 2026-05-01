import { z } from 'zod';
import { driftFindingSchema } from './finding.js';

export const reportStatusSchema = z.enum(['ok', 'drift_found', 'error']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportOutputSchema = z.object({
  status: reportStatusSchema,
  totalFindings: z.number(),
  findings: z.array(driftFindingSchema),
  warnings: z.array(z.object({
    filePath: z.string(),
    message: z.string(),
  })),
});
export type ReportOutput = z.infer<typeof reportOutputSchema>;