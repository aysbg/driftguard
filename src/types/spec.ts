import { z } from 'zod';

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: unknown;
}

export const openApiParameterSchema = z.object({
  name: z.string(),
  in: z.enum(['path', 'query', 'header', 'cookie']),
  required: z.boolean().optional(),
  description: z.string().optional(),
  schema: z.unknown().optional(),
});

export interface OpenApiResponse {
  statusCode: string;
  description?: string;
}

export const openApiResponseSchema = z.object({
  statusCode: z.string(),
  description: z.string().optional(),
});

export const specSectionSchema = z.object({
  filePath: z.string(),
  heading: z.string(),
  slug: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  text: z.string(),
});
export type SpecSection = z.infer<typeof specSectionSchema>;

export const dataModelPropertySchema = z.object({
  name: z.string(),
  type: z.string().optional(),
});
export type DataModelProperty = z.infer<typeof dataModelPropertySchema>;

export const dataModelSchema = z.object({
  name: z.string(),
  filePath: z.string(),
  properties: z.array(dataModelPropertySchema),
  source: z.enum(['openapi', 'foundation', 'local']),
});
export type DataModel = z.infer<typeof dataModelSchema>;

export const businessRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  filePath: z.string(),
  startLine: z.number(),
  endLine: z.number(),
});
export type BusinessRule = z.infer<typeof businessRuleSchema>;

export const storySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()),
  filePath: z.string(),
});
export type Story = z.infer<typeof storySchema>;

export const openApiOperationSchema = z.object({
  filePath: z.string(),
  method: z.string(),
  path: z.string(),
  operationId: z.string().optional(),
  summary: z.string().optional(),
  parameters: z.array(openApiParameterSchema).optional(),
  responses: z.array(openApiResponseSchema).optional(),
});
export type OpenApiOperation = z.infer<typeof openApiOperationSchema>;

export const specDocumentSchema = z.object({
  filePath: z.string(),
  sections: z.array(specSectionSchema),
  operations: z.array(openApiOperationSchema),
  source: z.enum(['foundation', 'local']).optional(),
  dataModels: z.array(dataModelSchema).optional(),
  businessRules: z.array(businessRuleSchema).optional(),
  stories: z.array(storySchema).optional(),
});
export type SpecDocument = z.infer<typeof specDocumentSchema>;

export const adrFrontmatterSchema = z.object({
  status: z.string().optional(),
  date: z.string().optional(),
  decision: z.string().optional(),
  supersededBy: z.string().optional(),
});
export type AdrFrontmatter = z.infer<typeof adrFrontmatterSchema>;

export const adrDocumentSchema = specDocumentSchema.extend({
  frontmatter: adrFrontmatterSchema.optional(),
});
export type AdrDocument = z.infer<typeof adrDocumentSchema>;

export interface UnifiedSpecIR {
  documents: SpecDocument[];
  parseWarnings: ParseWarning[];
}

export interface ParseWarning {
  filePath: string;
  message: string;
}
