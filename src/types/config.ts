import { z } from 'zod';

export const specPathSchema = z.string();
export type SpecPath = z.infer<typeof specPathSchema>;

export const codePathSchema = z.string();
export type CodePath = z.infer<typeof codePathSchema>;

export const resolvedConfigSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
  configFile: z.string().nullable(),
});
export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>;

export const scanInputSchema = z.object({
  repo: z.string(),
  spec: z.array(z.string()),
  code: z.array(z.string()),
});
export type ScanInput = z.infer<typeof scanInputSchema>;
