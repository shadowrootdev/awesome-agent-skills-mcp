import { z } from 'zod';
import { parameterSchemaSchema } from './parameter.js';

export const skillMetadataSchema = z.object({
  author: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  sourceOrg: z.string().optional(),
  sourceRepo: z.string().optional(),
});

export type SkillMetadata = z.infer<typeof skillMetadataSchema>;

export const skillSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  source: z.enum(['repository', 'local']),
  sourcePath: z.string(),
  content: z.string(),
  parameters: z.array(parameterSchemaSchema).optional(),
  metadata: skillMetadataSchema,
  lastUpdated: z.date(),
});

export type Skill = z.infer<typeof skillSchema>;

export const invocationErrorSchema = z.object({
  code: z.enum(['InvalidParams', 'SkillNotFound', 'ExecutionError', 'RepositoryError', 'InternalError']),
  message: z.string(),
  details: z.record(z.any()).optional(),
});

export type InvocationError = z.infer<typeof invocationErrorSchema>;

export const invocationResultSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  error: invocationErrorSchema.optional(),
  executionTime: z.number().int().min(0),
});

export type InvocationResult = z.infer<typeof invocationResultSchema>;

export function createSuccessResult(content: string, executionTime: number): InvocationResult {
  return {
    success: true,
    content,
    executionTime,
  };
}

export function createErrorResult(
  code: InvocationError['code'],
  message: string,
  executionTime: number,
  details?: Record<string, unknown>
): InvocationResult {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    executionTime,
  };
}
