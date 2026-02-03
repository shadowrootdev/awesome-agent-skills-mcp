import { z } from 'zod';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const configSchema = z.object({
  skillsRepoUrl: z.string().default('https://github.com/VoltAgent/awesome-agent-skills.git'),
  skillsRepoBranch: z.string().default('main'),
  cacheDir: z.string().default('.cache'),
  syncIntervalMinutes: z.number().int().min(0).default(60),
  localSkillsPath: z.string().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const config = configSchema.parse({
    skillsRepoUrl: process.env.SKILLS_REPO_URL,
    skillsRepoBranch: process.env.SKILLS_REPO_BRANCH,
    cacheDir: process.env.SKILLS_CACHE_DIR,
    syncIntervalMinutes: process.env.SKILLS_SYNC_INTERVAL
      ? parseInt(process.env.SKILLS_SYNC_INTERVAL, 10)
      : undefined,
    localSkillsPath: process.env.SKILLS_LOCAL_PATH,
    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || undefined,
  });

  // Ensure cache directory exists
  if (!existsSync(config.cacheDir)) {
    mkdirSync(config.cacheDir, { recursive: true });
  }

  return config;
}

export const config = loadConfig();

// Derived paths
export const paths = {
  cacheDir: config.cacheDir,
  skillsCacheFile: join(config.cacheDir, 'skills.json'),
  metadataCacheFile: join(config.cacheDir, 'metadata.json'),
  repoDir: join(config.cacheDir, 'repo', 'awesome-agent-skills'),
  overridesFile: '.config/skill-overrides.json',
};
