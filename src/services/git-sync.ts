import { simpleGit, SimpleGit } from 'simple-git';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

export interface GitSyncResult {
  success: boolean;
  updated: boolean;
  message: string;
  skillsChanged?: boolean;
}

export class GitSyncService {
  private git: SimpleGit;
  private repoDir: string;
  private repoUrl: string;
  private branch: string;

  constructor(repoDir: string, repoUrl: string, branch: string = 'main') {
    this.repoDir = repoDir;
    this.repoUrl = repoUrl;
    this.branch = branch;
    
    // Ensure the directory exists before initializing simple-git
    if (!existsSync(repoDir)) {
      mkdirSync(repoDir, { recursive: true });
    }
    
    this.git = simpleGit(repoDir, {
      timeout: {
        block: 60000, // 60 seconds timeout for git operations
      },
    }) as SimpleGit;
  }

  async initialize(): Promise<GitSyncResult> {
    try {
      if (existsSync(join(this.repoDir, '.git'))) {
        logger.info('Repository already exists, checking for updates...');
        return await this.sync();
      }

      logger.info(`Cloning repository from ${this.repoUrl}...`);
      const git = simpleGit({
        timeout: {
          block: 120000, // 120 seconds timeout for clone
        },
      });
      await git.clone(this.repoUrl, this.repoDir, ['--depth', '1', '--branch', this.branch]);

      logger.info('Repository cloned successfully');
      return {
        success: true,
        updated: true,
        message: 'Repository cloned successfully',
        skillsChanged: true,
      };
    } catch (error) {
      logger.error('Failed to initialize git repository:', error);
      return {
        success: false,
        updated: false,
        message: `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async sync(): Promise<GitSyncResult> {
    try {
      if (!existsSync(join(this.repoDir, '.git'))) {
        return await this.initialize();
      }

      logger.debug('Fetching latest changes...');

      // Fetch with depth 1 to check for updates
      await this.git.fetch(['--depth', '1', 'origin', this.branch]);

      // Get current and remote HEAD
      const currentRev = await this.git.revparse(['HEAD']);
      const remoteRev = await this.git.revparse([`origin/${this.branch}`]);

      if (currentRev === remoteRev) {
        logger.debug('Repository is up to date');
        return {
          success: true,
          updated: false,
          message: 'Repository is up to date',
          skillsChanged: false,
        };
      }

      logger.info('Updates found, pulling changes...');
      await this.git.reset(['--hard', `origin/${this.branch}`]);

      logger.info('Repository updated successfully');
      return {
        success: true,
        updated: true,
        message: 'Repository updated successfully',
        skillsChanged: true,
      };
    } catch (error) {
      logger.error('Failed to sync repository:', error);
      return {
        success: false,
        updated: false,
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getLastCommitTime(): Promise<Date | null> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      if (log.latest?.date) {
        return new Date(log.latest.date);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get last commit time:', error);
      return null;
    }
  }

  getRepoDir(): string {
    return this.repoDir;
  }

  async startAutoSync(intervalMinutes: number, onUpdate?: () => Promise<void>): Promise<void> {
    const intervalMs = intervalMinutes * 60 * 1000;

    logger.info(`Starting auto-sync every ${intervalMinutes} minutes`);

    setInterval(async () => {
      try {
        logger.debug('Running scheduled sync...');
        const result = await this.sync();

        if (result.success && result.updated && onUpdate) {
          logger.info('Skills updated, triggering callback...');
          try {
            await onUpdate();
          } catch (callbackError) {
            logger.error('Auto-sync callback failed:', callbackError);
          }
        }
      } catch (error) {
        logger.error('Auto-sync failed:', error);
      }
    }, intervalMs);
  }
}
