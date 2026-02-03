import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SkillRegistry } from '../models/registry.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

export interface CacheMetadata {
  version: string;
  lastUpdated: string;
  skillCount: number;
}

export class CacheManager {
  private cacheDir: string;
  private skillsFile: string;
  private metadataFile: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.skillsFile = join(cacheDir, 'skills.json');
    this.metadataFile = join(cacheDir, 'metadata.json');
  }

  async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
      logger.debug(`Created cache directory: ${this.cacheDir}`);
    }
  }

  async saveSkills(registry: SkillRegistry): Promise<void> {
    await this.ensureCacheDir();

    const data = registry.toJSON();
    await writeFile(this.skillsFile, JSON.stringify(data, null, 2), 'utf-8');

    const metadata: CacheMetadata = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      skillCount: registry.getSkillCount(),
    };
    await writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');

    logger.debug(`Saved ${registry.getSkillCount()} skills to cache`);
  }

  async loadSkills(): Promise<SkillRegistry | null> {
    try {
      if (!existsSync(this.skillsFile)) {
        logger.debug('No cached skills found');
        return null;
      }

      const data = JSON.parse(await readFile(this.skillsFile, 'utf-8'));
      const registry = SkillRegistry.fromJSON(data);

      logger.debug(`Loaded ${registry.getSkillCount()} skills from cache`);
      return registry;
    } catch (error) {
      logger.error('Failed to load skills from cache:', error);
      return null;
    }
  }

  async getMetadata(): Promise<CacheMetadata | null> {
    try {
      if (!existsSync(this.metadataFile)) {
        return null;
      }

      const data = JSON.parse(await readFile(this.metadataFile, 'utf-8'));
      return data as CacheMetadata;
    } catch (error) {
      logger.error('Failed to load cache metadata:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.skillsFile)) {
        await writeFile(this.skillsFile, '{}', 'utf-8');
      }
      if (existsSync(this.metadataFile)) {
        await writeFile(
          this.metadataFile,
          JSON.stringify({ version: '1.0.0', lastUpdated: new Date().toISOString(), skillCount: 0 }),
          'utf-8'
        );
      }
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  isCacheValid(maxAgeMinutes: number = 60): boolean {
    try {
      if (!existsSync(this.metadataFile)) {
        return false;
      }

      const metadata = JSON.parse(readFileSync(this.metadataFile, 'utf-8')) as CacheMetadata;
      const lastUpdated = new Date(metadata.lastUpdated);
      const ageMs = Date.now() - lastUpdated.getTime();
      const ageMinutes = ageMs / (1000 * 60);

      return ageMinutes < maxAgeMinutes;
    } catch {
      return false;
    }
  }
}
