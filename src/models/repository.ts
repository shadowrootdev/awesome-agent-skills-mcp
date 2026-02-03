import { z } from 'zod';

export const repositorySourceSchema = z.object({
  type: z.enum(['git', 'local']),
  url: z.string().optional(),
  branch: z.string().default('main'),
  path: z.string().optional(),
  priority: z.number().int().default(0),
});

export type RepositorySource = z.infer<typeof repositorySourceSchema>;

export function validateRepositorySource(source: unknown): RepositorySource {
  const validated = repositorySourceSchema.parse(source);

  if (validated.type === 'git' && !validated.url) {
    throw new Error('Git repository source must have a URL');
  }

  if (validated.type === 'local' && !validated.path) {
    throw new Error('Local source must have a path');
  }

  return validated;
}
