import { Skill } from './skill.js';
import { RepositorySource } from './repository.js';
import { validateParameterValue } from './parameter.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private sources: RepositorySource[] = [];
  private cachePath: string;
  private lastSync: Date | null = null;

  constructor(cachePath: string) {
    this.cachePath = cachePath;
  }

  addSource(source: RepositorySource): void {
    this.sources.push(source);
    // Sort by priority (higher first)
    this.sources.sort((a, b) => b.priority - a.priority);
  }

  getSources(): RepositorySource[] {
    return [...this.sources];
  }

  registerSkill(skill: Skill): void {
    // Check if skill already exists from a lower priority source
    const existing = this.skills.get(skill.id);
    if (existing) {
      const existingSource = this.sources.find((s) =>
        existing.source === 'repository'
          ? s.type === 'git'
          : s.type === 'local'
      );
      const newSource = this.sources.find((s) =>
        skill.source === 'repository' ? s.type === 'git' : s.type === 'local'
      );

      const existingPriority = existingSource?.priority ?? 0;
      const newPriority = newSource?.priority ?? 0;

      if (newPriority < existingPriority) {
        // Skip - existing skill has higher priority
        return;
      }
    }

    this.skills.set(skill.id, skill);
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  listSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  hasSkill(id: string): boolean {
    return this.skills.has(id);
  }

  clear(): void {
    this.skills.clear();
  }

  getSkillCount(): number {
    return this.skills.size;
  }

  setLastSync(date: Date): void {
    this.lastSync = date;
  }

  getLastSync(): Date | null {
    return this.lastSync;
  }

  validateParameters(skillId: string, params: Record<string, unknown>): ValidationResult {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return { valid: false, errors: [`Skill not found: ${skillId}`] };
    }

    const errors: string[] = [];
    const parameters = skill.parameters || [];

    // Check required parameters
    for (const param of parameters) {
      if (param.required && !(param.name in params)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      // Validate provided parameters
      if (param.name in params) {
        const value = params[param.name];
        const result = validateParameterValue(param, value);
        if (!result.valid) {
          errors.push(`Invalid parameter '${param.name}': ${result.error}`);
        }
      }
    }

    // Check for unknown parameters
    const knownParams = new Set(parameters.map((p) => p.name));
    for (const paramName of Object.keys(params)) {
      if (!knownParams.has(paramName)) {
        errors.push(`Unknown parameter: ${paramName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  toJSON(): object {
    return {
      skills: Array.from(this.skills.values()),
      sources: this.sources,
      cachePath: this.cachePath,
      lastSync: this.lastSync?.toISOString(),
    };
  }

  static fromJSON(data: object): SkillRegistry {
    const registry = new SkillRegistry((data as { cachePath: string }).cachePath);

    if ((data as { skills?: Skill[] }).skills) {
      for (const skill of (data as { skills: Skill[] }).skills) {
        registry.registerSkill(skill);
      }
    }

    if ((data as { sources?: RepositorySource[] }).sources) {
      for (const source of (data as { sources: RepositorySource[] }).sources) {
        registry.addSource(source);
      }
    }

    if ((data as { lastSync?: string }).lastSync) {
      registry.setLastSync(new Date((data as { lastSync: string }).lastSync));
    }

    return registry;
  }
}
