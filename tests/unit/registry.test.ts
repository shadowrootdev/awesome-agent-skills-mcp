import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry } from '../../src/models/registry.js';
import { Skill } from '../../src/models/skill.js';
import { RepositorySource } from '../../src/models/repository.js';

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry('/tmp/cache');
  });

  describe('registerSkill', () => {
    it('should register a skill', () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        source: 'repository',
        sourcePath: '/path/to/skill',
        content: 'Test content',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill);
      expect(registry.getSkillCount()).toBe(1);
      expect(registry.getSkill('test-skill')).toEqual(skill);
    });

    it('should override skills based on priority', () => {
      // Add repository source with lower priority
      registry.addSource({
        type: 'git',
        url: 'https://github.com/test/repo.git',
        branch: 'main',
        priority: 1,
      });

      // Add local source with higher priority
      registry.addSource({
        type: 'local',
        path: '/local/skills',
        branch: 'main',
        priority: 2,
      });

      const repoSkill: Skill = {
        id: 'test-skill',
        name: 'Repo Skill',
        description: 'From repo',
        source: 'repository',
        sourcePath: '/repo/skill',
        content: 'Repo content',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      const localSkill: Skill = {
        id: 'test-skill',
        name: 'Local Skill',
        description: 'From local',
        source: 'local',
        sourcePath: '/local/skill',
        content: 'Local content',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(repoSkill);
      registry.registerSkill(localSkill);

      const skill = registry.getSkill('test-skill');
      expect(skill?.name).toBe('Local Skill');
    });
  });

  describe('validateParameters', () => {
    it('should validate required parameters', () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        source: 'repository',
        sourcePath: '/path/to/skill',
        content: 'Test content',
        parameters: [
          {
            name: 'requiredParam',
            type: 'string',
            description: 'A required parameter',
            required: true,
          },
        ],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill);

      const result = registry.validateParameters('test-skill', {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required parameter: requiredParam');
    });

    it('should validate parameter types', () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        source: 'repository',
        sourcePath: '/path/to/skill',
        content: 'Test content',
        parameters: [
          {
            name: 'numberParam',
            type: 'number',
            description: 'A number parameter',
            required: true,
          },
        ],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill);

      const result = registry.validateParameters('test-skill', { numberParam: 'not a number' });
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid parameter');
    });

    it('should reject unknown parameters', () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        source: 'repository',
        sourcePath: '/path/to/skill',
        content: 'Test content',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill);

      const result = registry.validateParameters('test-skill', { unknownParam: 'value' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown parameter: unknownParam');
    });
  });

  describe('listSkills', () => {
    it('should list all registered skills', () => {
      const skill1: Skill = {
        id: 'skill-1',
        name: 'Skill 1',
        description: 'First skill',
        source: 'repository',
        sourcePath: '/path/to/skill1',
        content: 'Content 1',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      const skill2: Skill = {
        id: 'skill-2',
        name: 'Skill 2',
        description: 'Second skill',
        source: 'repository',
        sourcePath: '/path/to/skill2',
        content: 'Content 2',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill1);
      registry.registerSkill(skill2);

      const skills = registry.listSkills();
      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.id)).toContain('skill-1');
      expect(skills.map((s) => s.id)).toContain('skill-2');
    });
  });
});
