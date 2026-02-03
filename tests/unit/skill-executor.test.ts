import { describe, it, expect } from 'vitest';
import { SkillExecutor } from '../../src/services/skill-executor.js';
import { SkillRegistry } from '../../src/models/registry.js';
import { Skill } from '../../src/models/skill.js';

describe('SkillExecutor', () => {
  const createTestSkill = (id: string, content: string): Skill => ({
    id,
    name: `Test ${id}`,
    description: `Test skill ${id}`,
    source: 'repository',
    sourcePath: `/path/to/${id}`,
    content,
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'A name parameter',
        required: true,
      },
    ],
    metadata: {},
    lastUpdated: new Date(),
  });

  describe('invokeSkill', () => {
    it('should return error for non-existent skill', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const executor = new SkillExecutor(registry);

      const result = await executor.invokeSkill('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SkillNotFound');
    });

    it('should substitute parameters into content', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const skill = createTestSkill('greeting', 'Hello, {{name}}!');
      registry.registerSkill(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.invokeSkill('greeting', { name: 'World' });

      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, World!');
    });

    it('should return error for missing required parameters', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const skill = createTestSkill('greeting', 'Hello, {{name}}!');
      registry.registerSkill(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.invokeSkill('greeting', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('InvalidParams');
    });

    it('should track execution time', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const skill = createTestSkill('simple', 'Simple content');
      skill.parameters = [];
      registry.registerSkill(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.invokeSkill('simple', {});

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSkillDocumentation', () => {
    it('should return skill content', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const skill = createTestSkill('docs', '# Documentation\n\nThis is the content.');
      skill.parameters = [];
      registry.registerSkill(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.getSkillDocumentation('docs');

      expect(result.success).toBe(true);
      expect(result.content).toBe('# Documentation\n\nThis is the content.');
    });

    it('should return error for non-existent skill', async () => {
      const registry = new SkillRegistry('/tmp/cache');
      const executor = new SkillExecutor(registry);

      const result = await executor.getSkillDocumentation('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SkillNotFound');
    });
  });

  describe('listSkills', () => {
    it('should filter skills by text', () => {
      const registry = new SkillRegistry('/tmp/cache');

      const skill1: Skill = {
        id: 'api-tester',
        name: 'API Tester',
        description: 'Test REST APIs',
        source: 'repository',
        sourcePath: '/path/to/api-tester',
        content: 'API testing skill',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      const skill2: Skill = {
        id: 'doc-creator',
        name: 'Document Creator',
        description: 'Create documents',
        source: 'repository',
        sourcePath: '/path/to/doc-creator',
        content: 'Document creation skill',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(skill1);
      registry.registerSkill(skill2);

      const executor = new SkillExecutor(registry);
      const filtered = executor.listSkills('api');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('api-tester');
    });

    it('should filter skills by source', () => {
      const registry = new SkillRegistry('/tmp/cache');

      const repoSkill: Skill = {
        id: 'repo-skill',
        name: 'Repo Skill',
        description: 'From repository',
        source: 'repository',
        sourcePath: '/path/to/repo',
        content: 'Repo skill',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      const localSkill: Skill = {
        id: 'local-skill',
        name: 'Local Skill',
        description: 'From local',
        source: 'local',
        sourcePath: '/path/to/local',
        content: 'Local skill',
        parameters: [],
        metadata: {},
        lastUpdated: new Date(),
      };

      registry.registerSkill(repoSkill);
      registry.registerSkill(localSkill);

      const executor = new SkillExecutor(registry);
      const localSkills = executor.listSkills(undefined, 'local');

      expect(localSkills).toHaveLength(1);
      expect(localSkills[0].id).toBe('local-skill');
    });
  });
});
