#!/usr/bin/env node

import { SkillRegistry } from './models/registry.js';
import { SkillExecutor } from './services/skill-executor.js';
import { CacheManager } from './cache/cache-manager.js';
import { GitSyncService } from './services/git-sync.js';
import { SkillParser } from './services/skill-parser.js';
import { MCPServer } from './server.js';
import { config, paths } from './config.js';
import { createLogger } from './utils/logger.js';
import { RepositorySource } from './models/repository.js';

const logger = createLogger(config.logLevel);

async function main(): Promise<void> {
  logger.info('Starting Awesome Agent Skills MCP Server...');
  logger.info(`Cache directory: ${paths.cacheDir}`);

  try {
    // Initialize cache manager
    const cacheManager = new CacheManager(paths.cacheDir);
    await cacheManager.ensureCacheDir();

    // Try to load cached skills first
    let registry = await cacheManager.loadSkills();

    if (!registry) {
      logger.info('No cached skills found, creating new registry');
      registry = new SkillRegistry(paths.cacheDir);
    } else {
      logger.info(`Loaded ${registry.getSkillCount()} skills from cache`);
    }

    // Add repository source
    const repoSource: RepositorySource = {
      type: 'git',
      url: config.skillsRepoUrl,
      branch: config.skillsRepoBranch,
      priority: 1,
    };
    registry.addSource(repoSource);

    // Add local source if configured
    if (config.localSkillsPath) {
      const localSource: RepositorySource = {
        type: 'local',
        path: config.localSkillsPath,
        branch: 'main', // Local sources don't use branch, but required by type
        priority: 2, // Higher priority than repo
      };
      registry.addSource(localSource);
    }

    // Initialize git sync service
    const gitSync = new GitSyncService(
      paths.repoDir,
      config.skillsRepoUrl,
      config.skillsRepoBranch
    );

    // Initialize skill parser
    const skillParser = new SkillParser();
    await skillParser.loadOverrides(paths.overridesFile);

    // Sync with repository
    logger.info('Syncing with skills repository...');
    const syncResult = await gitSync.initialize();

    if (syncResult.success) {
      if (syncResult.skillsChanged || registry.getSkillCount() === 0) {
        logger.info('Loading skills from repository...');
        const skills = await skillParser.parseSkillsFromRepo(paths.repoDir, 'repository');

        // Clear existing skills and add new ones
        registry.clear();
        for (const skill of skills) {
          registry.registerSkill(skill);
        }

        // Load local skills if configured
        if (config.localSkillsPath) {
          logger.info('Loading local skills...');
          const localSkills = await skillParser.parseSkillsFromRepo(
            config.localSkillsPath,
            'local'
          );
          for (const skill of localSkills) {
            registry.registerSkill(skill);
          }
        }

        // Save to cache
        await cacheManager.saveSkills(registry);
        registry.setLastSync(new Date());

        logger.info(`Loaded ${registry.getSkillCount()} skills total`);
      }
    } else {
      logger.warn(`Repository sync failed: ${syncResult.message}`);
      logger.warn('Using cached skills if available');
    }

    // Create skill executor
    const executor = new SkillExecutor(registry);

    // Define refresh callback for manual refresh via MCP tool
    const handleRefresh = async () => {
      const oldCount = registry.getSkillCount();
      logger.info('Manual refresh triggered via MCP tool...');

      const result = await gitSync.sync();

      if (result.success && result.skillsChanged) {
        const skills = await skillParser.parseSkillsFromRepo(paths.repoDir, 'repository');
        registry.clear();
        for (const skill of skills) {
          registry.registerSkill(skill);
        }

        // Load local skills if configured
        if (config.localSkillsPath) {
          const localSkills = await skillParser.parseSkillsFromRepo(
            config.localSkillsPath,
            'local'
          );
          for (const skill of localSkills) {
            registry.registerSkill(skill);
          }
        }

        await cacheManager.saveSkills(registry);
        registry.setLastSync(new Date());
        mcpServer.notifyToolsChanged();

        const newCount = registry.getSkillCount();
        return {
          success: true,
          skillsUpdated: newCount,
          skillsAdded: Math.max(0, newCount - oldCount),
          skillsRemoved: Math.max(0, oldCount - newCount),
          message: `Skills refreshed successfully. Now have ${newCount} skills.`,
        };
      }

      return {
        success: result.success,
        skillsUpdated: registry.getSkillCount(),
        skillsAdded: 0,
        skillsRemoved: 0,
        message: result.success ? 'No changes detected' : result.message,
      };
    };

    // Create and start MCP server
    const mcpServer = new MCPServer(registry, executor, handleRefresh);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await mcpServer.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await mcpServer.stop();
      process.exit(0);
    });

    // Start auto-sync if enabled
    if (config.syncIntervalMinutes > 0) {
      let isSyncing = false;
      gitSync.startAutoSync(config.syncIntervalMinutes, async () => {
        if (isSyncing) {
          logger.debug('Skipping auto-sync - previous sync still in progress');
          return;
        }
        isSyncing = true;
        try {
          logger.info('Auto-sync triggered, refreshing skills...');
          const result = await gitSync.sync();

          if (result.success && result.skillsChanged) {
            const skills = await skillParser.parseSkillsFromRepo(paths.repoDir, 'repository');
            registry.clear();
            for (const skill of skills) {
              registry.registerSkill(skill);
            }
            await cacheManager.saveSkills(registry);
            registry.setLastSync(new Date());
            mcpServer.notifyToolsChanged();
            logger.info(`Auto-sync completed: ${registry.getSkillCount()} skills loaded`);
          }
        } catch (error) {
          logger.error('Auto-sync callback failed:', error);
        } finally {
          isSyncing = false;
        }
      });
    }

    // Start the server
    await mcpServer.start();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
