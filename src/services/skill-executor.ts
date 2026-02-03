import { Skill, InvocationResult, createSuccessResult, createErrorResult } from '../models/skill.js';
import { SkillRegistry } from '../models/registry.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();

export class SkillExecutor {
  private registry: SkillRegistry;

  constructor(registry: SkillRegistry) {
    this.registry = registry;
  }

  async invokeSkill(skillId: string, parameters: Record<string, unknown> = {}): Promise<InvocationResult> {
    const startTime = Date.now();

    try {
      // Check if skill exists
      const skill = this.registry.getSkill(skillId);
      if (!skill) {
        const executionTime = Date.now() - startTime;
        logger.warn(`Skill not found: ${skillId}`);
        return createErrorResult('SkillNotFound', `Skill not found: ${skillId}`, executionTime);
      }

      // Validate parameters
      const validation = this.registry.validateParameters(skillId, parameters);
      if (!validation.valid) {
        const executionTime = Date.now() - startTime;
        const errorMessage = validation.errors?.join(', ') || 'Parameter validation failed';
        logger.warn(`Parameter validation failed for skill ${skillId}: ${errorMessage}`);
        return createErrorResult('InvalidParams', errorMessage, executionTime, { errors: validation.errors });
      }

      // Substitute parameters into skill content
      const formattedContent = this.substituteParameters(skill.content, parameters);

      const executionTime = Date.now() - startTime;
      logger.debug(`Skill ${skillId} invoked successfully in ${executionTime}ms`);

      return createSuccessResult(formattedContent, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error invoking skill ${skillId}:`, error);
      return createErrorResult('ExecutionError', errorMessage, executionTime);
    }
  }

  async getSkillDocumentation(skillId: string): Promise<InvocationResult> {
    const startTime = Date.now();

    try {
      const skill = this.registry.getSkill(skillId);
      if (!skill) {
        const executionTime = Date.now() - startTime;
        return createErrorResult('SkillNotFound', `Skill not found: ${skillId}`, executionTime);
      }

      const executionTime = Date.now() - startTime;
      return createSuccessResult(skill.content, executionTime);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createErrorResult('ExecutionError', errorMessage, executionTime);
    }
  }

  private substituteParameters(content: string, parameters: Record<string, unknown>): string {
    let result = content;

    for (const [key, value] of Object.entries(parameters)) {
      // Replace {{paramName}} placeholders
      const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(placeholder, String(value));

      // Replace ${paramName} placeholders (alternative syntax)
      const altPlaceholder = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'g');
      result = result.replace(altPlaceholder, String(value));
    }

    return result;
  }

  listSkills(filter?: string, source?: 'all' | 'repository' | 'local'): Array<{
    id: string;
    name: string;
    description: string;
    source: string;
    parameters?: Array<{ name: string; type: string; description: string; required: boolean }>;
  }> {
    let skills = this.registry.listSkills();

    // Apply source filter
    if (source && source !== 'all') {
      skills = skills.filter((skill) => skill.source === source);
    }

    // Apply text filter
    if (filter) {
      const filterLower = filter.toLowerCase();
      skills = skills.filter(
        (skill) =>
          skill.name.toLowerCase().includes(filterLower) ||
          skill.description.toLowerCase().includes(filterLower) ||
          skill.id.toLowerCase().includes(filterLower)
      );
    }

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source: skill.source,
      parameters: skill.parameters?.map((p) => ({
        name: p.name,
        type: p.type,
        description: p.description,
        required: p.required,
      })),
    }));
  }

  getSkill(skillId: string): Skill | undefined {
    return this.registry.getSkill(skillId);
  }
}
