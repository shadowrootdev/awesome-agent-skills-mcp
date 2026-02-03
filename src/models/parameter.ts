import { z } from 'zod';

export const parameterTypeSchema = z.enum(['string', 'number', 'boolean', 'object', 'array']);

export const parameterSchemaSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/, 'Must be a valid JavaScript identifier'),
  type: parameterTypeSchema,
  description: z.string().min(1).max(1000),
  required: z.boolean().default(false),
  default: z.any().optional(),
  enum: z.array(z.any()).optional(),
});

export type ParameterSchema = z.infer<typeof parameterSchemaSchema>;

export function validateParameterValue(
  param: ParameterSchema,
  value: unknown
): { valid: boolean; error?: string } {
  try {
    let validator: z.ZodType<unknown>;

    switch (param.type) {
      case 'string':
        validator = z.string();
        break;
      case 'number':
        validator = z.number();
        break;
      case 'boolean':
        validator = z.boolean();
        break;
      case 'object':
        validator = z.record(z.any());
        break;
      case 'array':
        validator = z.array(z.any());
        break;
      default:
        return { valid: false, error: `Unknown parameter type: ${param.type}` };
    }

    if (param.enum && param.type === 'string') {
      validator = validator.refine((val) => param.enum?.includes(val), {
        message: `Value must be one of: ${param.enum?.join(', ')}`,
      });
    }

    validator.parse(value);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Validation failed' };
    }
    return { valid: false, error: String(error) };
  }
}
