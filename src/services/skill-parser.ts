import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Skill, SkillMetadata } from '../models/skill.js';
import { ParameterSchema } from '../models/parameter.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

interface SkillLink {
  name: string;
  org: string;
  repo: string;
  path: string;
  description: string;
  url: string;
}

interface ParsedSkill {
  name: string;
  description: string;
  content: string;
  metadata: SkillMetadata;
  parameters: ParameterSchema[];
}

export class SkillParser {
  private overrides: Map<string, Partial<ParsedSkill>> = new Map();

  async loadOverrides(overridesPath: string): Promise<void> {
    try {
      if (!existsSync(overridesPath)) {
        logger.debug(`No overrides file found at ${overridesPath}`);
        return;
      }

      const content = await readFile(overridesPath, 'utf-8');
      const data = JSON.parse(content);

      for (const [skillId, override] of Object.entries(data)) {
        this.overrides.set(skillId, override as Partial<ParsedSkill>);
      }

      logger.debug(`Loaded ${this.overrides.size} skill overrides`);
    } catch (error) {
      logger.warn('Failed to load skill overrides:', error);
    }
  }

  async parseSkillsFromRepo(repoDir: string, source: 'repository' | 'local'): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      // Check if this is a VoltAgent-style "awesome list" repo (just README with links)
      const readmePath = join(repoDir, 'README.md');
      const skillsDir = join(repoDir, 'skills');

      if (existsSync(readmePath) && !existsSync(skillsDir)) {
        // This is an awesome-list style repo - parse README for skill links
        logger.info('Detected awesome-list style repository, parsing README for skills...');
        const readmeSkills = await this.parseSkillsFromReadme(readmePath, source);
        skills.push(...readmeSkills);
      } else if (existsSync(skillsDir)) {
        // Traditional skills directory structure
        const dirSkills = await this.parseSkillsFromDirectory(skillsDir, source);
        skills.push(...dirSkills);
      } else {
        logger.warn(`No skills found in ${repoDir}`);
      }

      return skills;
    } catch (error) {
      logger.error('Failed to parse skills from repository:', error);
      return skills;
    }
  }

  private async parseSkillsFromReadme(readmePath: string, source: 'repository' | 'local'): Promise<Skill[]> {
    const skills: Skill[] = [];

    try {
      const content = await readFile(readmePath, 'utf-8');
      
      // Extract skill links from markdown
      // Format: - **[org/skill-name](https://github.com/org/repo/tree/main/skills/skill-name)** - Description
      const skillLinkRegex = /\*\*\[([^\]]+)\]\((https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/[^/]+\/(.+?))\)\*\*\s*-\s*(.+)/g;
      
      let match;
      const skillLinks: SkillLink[] = [];
      
      while ((match = skillLinkRegex.exec(content)) !== null) {
        const [, name, url, org, repo, path, description] = match;
        skillLinks.push({
          name: name.trim(),
          org,
          repo,
          path: path.trim(),
          description: description.trim(),
          url,
        });
      }

      logger.info(`Found ${skillLinks.length} skill links in README`);

      // Fetch actual skill content from GitHub
      for (const link of skillLinks) {
        try {
          const skill = await this.fetchSkillFromGitHub(link, source);
          if (skill) {
            skills.push(skill);
          }
        } catch (error) {
          logger.warn(`Failed to fetch skill ${link.name}: ${error}`);
          // Create a stub skill with the metadata from README
          const stubSkill = this.createSkillStub(link, source);
          skills.push(stubSkill);
        }
      }

      return skills;
    } catch (error) {
      logger.error('Failed to parse skills from README:', error);
      return skills;
    }
  }

  private async fetchSkillFromGitHub(link: SkillLink, source: 'repository' | 'local'): Promise<Skill | null> {
    // Try to fetch the SKILL.md or README.md from the GitHub raw URL
    const possibleFiles = ['SKILL.md', 'README.md', 'skill.md'];
    
    for (const file of possibleFiles) {
      try {
        // Convert tree URL to raw URL
        // https://github.com/org/repo/tree/main/path -> https://raw.githubusercontent.com/org/repo/main/path/file
        const rawUrl = `https://raw.githubusercontent.com/${link.org}/${link.repo}/main/${link.path}/${file}`;
        
        const response = await fetch(rawUrl, {
          headers: {
            'User-Agent': 'awesome-agent-skills-mcp/1.0.0',
          },
        });

        if (response.ok) {
          const content = await response.text();
          const parsed = this.parseMarkdown(content);
          
          const skillId = this.normalizeSkillId(link.path.split('/').pop() || link.name);
          
          // Apply overrides if any
          const override = this.overrides.get(skillId);
          if (override) {
            Object.assign(parsed, override);
          }

          const skill: Skill = {
            id: skillId,
            name: parsed.name || link.name.split('/').pop() || skillId,
            description: parsed.description || link.description,
            source,
            sourcePath: link.url,
            content: parsed.content,
            parameters: parsed.parameters,
            metadata: {
              ...parsed.metadata,
              sourceOrg: link.org,
              sourceRepo: link.repo,
            },
            lastUpdated: new Date(),
          };

          logger.debug(`Fetched skill: ${skill.name} from ${rawUrl}`);
          return skill;
        }
      } catch (error) {
        // Try next file
        continue;
      }
    }

    return null;
  }

  private createSkillStub(link: SkillLink, source: 'repository' | 'local'): Skill {
    const skillId = this.normalizeSkillId(link.path.split('/').pop() || link.name);
    
    return {
      id: skillId,
      name: link.name.split('/').pop() || skillId,
      description: link.description,
      source,
      sourcePath: link.url,
      content: `# ${link.name}\n\n${link.description}\n\n## Source\n\nThis skill is available at: ${link.url}\n\nPlease visit the source repository for full documentation and usage instructions.`,
      parameters: [],
      metadata: {
        sourceOrg: link.org,
        sourceRepo: link.repo,
      },
      lastUpdated: new Date(),
    };
  }

  private async parseSkillsFromDirectory(skillsDir: string, source: 'repository' | 'local'): Promise<Skill[]> {
    const skills: Skill[] = [];
    const { readdir } = await import('fs/promises');

    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      const skillDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

      logger.info(`Found ${skillDirs.length} potential skill directories`);

      for (const skillDirName of skillDirs) {
        const skillDir = join(skillsDir, skillDirName);
        const skill = await this.parseSkillDirectory(skillDir, source);

        if (skill) {
          skills.push(skill);
        }
      }

      logger.info(`Successfully parsed ${skills.length} skills`);
      return skills;
    } catch (error) {
      logger.error('Failed to parse skills from directory:', error);
      return skills;
    }
  }

  async parseSkillDirectory(skillDir: string, source: 'repository' | 'local'): Promise<Skill | null> {
    const { readdir } = await import('fs/promises');
    
    try {
      const skillId = skillDir.split('/').pop() || '';
      if (!skillId) {
        return null;
      }

      // Find the main skill file (SKILL.md preferred over README.md)
      let skillFile: string | null = null;
      const files = await readdir(skillDir);

      if (files.includes('SKILL.md')) {
        skillFile = join(skillDir, 'SKILL.md');
      } else if (files.includes('README.md')) {
        skillFile = join(skillDir, 'README.md');
      } else {
        // Try any .md file
        const { extname } = await import('path');
        const mdFile = files.find((f) => extname(f) === '.md');
        if (mdFile) {
          skillFile = join(skillDir, mdFile);
        }
      }

      if (!skillFile) {
        logger.warn(`No skill file found in ${skillDir}`);
        return null;
      }

      const content = await readFile(skillFile, 'utf-8');
      const parsed = this.parseMarkdown(content);

      // Apply overrides if any
      const override = this.overrides.get(skillId);
      if (override) {
        Object.assign(parsed, override);
      }

      const skill: Skill = {
        id: this.normalizeSkillId(skillId),
        name: parsed.name || skillId,
        description: parsed.description || '',
        source,
        sourcePath: skillDir,
        content: parsed.content,
        parameters: parsed.parameters,
        metadata: parsed.metadata,
        lastUpdated: new Date(),
      };

      return skill;
    } catch (error) {
      logger.error(`Failed to parse skill directory ${skillDir}:`, error);
      return null;
    }
  }

  private parseMarkdown(content: string): ParsedSkill {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    let frontmatter: Record<string, unknown> = {};
    let body = content;

    if (frontmatterMatch) {
      frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
      body = frontmatterMatch[2];
    }

    // Extract parameters from the content
    const parameters = this.extractParameters(body);

    return {
      name: (frontmatter.name as string) || this.extractTitle(body) || '',
      description: (frontmatter.description as string) || this.extractDescription(body) || '',
      content: body.trim(),
      metadata: {
        author: frontmatter.author as string | undefined,
        version: frontmatter.version as string | undefined,
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : undefined,
        requirements: Array.isArray(frontmatter.requirements) ? frontmatter.requirements : undefined,
      },
      parameters,
    };
  }

  private parseFrontmatter(frontmatter: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const line of frontmatter.split('\n')) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Try to parse as array if it looks like one
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            result[key.trim()] = JSON.parse(value);
          } catch {
            result[key.trim()] = value.trim();
          }
        } else {
          result[key.trim()] = value.trim();
        }
      }
    }

    return result;
  }

  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  private extractDescription(content: string): string | null {
    // Look for description in "When to Use" or first paragraph
    const whenToUseMatch = content.match(/##\s*When to Use\s*\n+([^\n#]+)/i);
    if (whenToUseMatch) {
      return whenToUseMatch[1].trim();
    }

    // First paragraph after title
    const firstParaMatch = content.match(/^#\s+.+\n+([^\n#]+)/m);
    if (firstParaMatch) {
      return firstParaMatch[1].trim();
    }

    return null;
  }

  private extractParameters(content: string): ParameterSchema[] {
    const parameters: ParameterSchema[] = [];

    // Look for Parameters section
    const paramsMatch = content.match(/##\s*Parameters?\s*\n+([\s\S]*?)(?=##|$)/i);
    if (!paramsMatch) {
      return parameters;
    }

    const paramsSection = paramsMatch[1];

    // Parse parameter lines
    // Pattern: - paramName: description
    // Pattern: - paramName (type): description
    // Pattern: - paramName (type, required): description
    // Pattern: - paramName (type, optional): description
    const paramRegex = /^[-*]\s+(\w+)(?:\s*\(([^)]+)\))?\s*:\s*(.+)$/gm;

    let match;
    while ((match = paramRegex.exec(paramsSection)) !== null) {
      const [, name, typeHintRaw, description] = match;

      // Parse the type hint which may contain "type" or "type, required" or "type, optional"
      let type: ParameterSchema['type'] = 'string';
      let explicitRequired: boolean | undefined;

      if (typeHintRaw) {
        const typeHintParts = typeHintRaw.split(',').map((s) => s.trim().toLowerCase());

        // First part is the type
        const typeStr = typeHintParts[0];
        if (['string', 'number', 'boolean', 'object', 'array'].includes(typeStr)) {
          type = typeStr as ParameterSchema['type'];
        }

        // Second part may be required/optional
        if (typeHintParts.length > 1) {
          if (typeHintParts[1] === 'required') {
            explicitRequired = true;
          } else if (typeHintParts[1] === 'optional') {
            explicitRequired = false;
          }
        }
      } else {
        // Infer type from description
        if (description.toLowerCase().includes('true/false') || description.toLowerCase().includes('boolean')) {
          type = 'boolean';
        } else if (description.toLowerCase().includes('array') || description.toLowerCase().includes('list')) {
          type = 'array';
        } else if (description.toLowerCase().includes('object') || description.toLowerCase().includes('map')) {
          type = 'object';
        }
      }

      // Determine if required: explicit > infer from description
      // If no explicit required/optional is specified and no type hint contains 'required',
      // default to optional (conservative approach)
      let isRequired: boolean;
      if (explicitRequired !== undefined) {
        isRequired = explicitRequired;
      } else if (typeHintRaw) {
        // If type hint exists but no required/optional keyword, default to optional
        const descLower = description.toLowerCase();
        isRequired = descLower.includes('(required)') || descLower.includes('is required');
      } else {
        // No type hint at all - check description for required/optional keywords
        const descLower = description.toLowerCase();
        if (descLower.includes('optional') || descLower.includes('default')) {
          isRequired = false;
        } else if (descLower.includes('required')) {
          isRequired = true;
        } else {
          // Default to optional if not explicitly specified
          isRequired = false;
        }
      }

      parameters.push({
        name,
        type,
        description: description.trim(),
        required: isRequired,
      });
    }

    return parameters;
  }

  private normalizeSkillId(id: string): string {
    return id
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
