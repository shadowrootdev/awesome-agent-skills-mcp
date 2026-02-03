import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SkillExecutor } from './services/skill-executor.js';
import { SkillRegistry } from './models/registry.js';
import { getLogger } from './utils/logger.js';

const logger = getLogger();

export class MCPServer {
  private server: Server;
  private executor: SkillExecutor;
  private registry: SkillRegistry;
  private onRefresh?: () => Promise<{ success: boolean; skillsUpdated: number; skillsAdded: number; skillsRemoved: number; message: string }>;

  constructor(
    registry: SkillRegistry,
    executor: SkillExecutor,
    onRefresh?: () => Promise<{ success: boolean; skillsUpdated: number; skillsAdded: number; skillsRemoved: number; message: string }>
  ) {
    this.registry = registry;
    this.executor = executor;
    this.onRefresh = onRefresh;

    this.server = new Server(
      {
        name: 'awesome-agent-skills-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling tools/list request');

      const tools: Tool[] = [
        {
          name: 'list_skills',
          description: 'List all available agent skills that can be invoked',
          inputSchema: {
            type: 'object',
            properties: {
              filter: {
                type: 'string',
                description: 'Optional filter to search skills by name or description',
              },
              source: {
                type: 'string',
                enum: ['all', 'repository', 'local'],
                description: 'Filter by skill source',
                default: 'all',
              },
            },
          },
          outputSchema: {
            type: 'object',
            properties: {
              skills: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    source: { type: 'string' },
                    parameters: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          type: { type: 'string' },
                          description: { type: 'string' },
                          required: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
              total: { type: 'number' },
              lastSync: { type: 'string', format: 'date-time' },
            },
          },
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        {
          name: 'get_skill',
          description: 'Get detailed information and documentation for a specific skill',
          inputSchema: {
            type: 'object',
            properties: {
              skill_id: {
                type: 'string',
                description: 'Unique identifier of the skill',
              },
            },
            required: ['skill_id'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              content: { type: 'string' },
              source: { type: 'string' },
              parameters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' },
                    required: { type: 'boolean' },
                  },
                },
              },
              metadata: {
                type: 'object',
                properties: {
                  author: { type: 'string' },
                  version: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  requirements: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        {
          name: 'invoke_skill',
          description: 'Invoke a skill with parameters to get formatted instructions',
          inputSchema: {
            type: 'object',
            properties: {
              skill_id: {
                type: 'string',
                description: 'Unique identifier of the skill to invoke',
              },
              parameters: {
                type: 'object',
                description: 'Parameters to pass to the skill',
                additionalProperties: true,
              },
            },
            required: ['skill_id'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              content: { type: 'string' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: { type: 'object' },
                },
              },
              executionTime: { type: 'number' },
            },
          },
          annotations: {
            readOnlyHint: false,
            openWorldHint: false,
          },
        },
        {
          name: 'refresh_skills',
          description: 'Refresh skills cache from the repository',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          outputSchema: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              skillsUpdated: { type: 'number' },
              skillsAdded: { type: 'number' },
              skillsRemoved: { type: 'number' },
              message: { type: 'string' },
            },
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug(`Handling tool call: ${name}`, args);

      try {
        switch (name) {
          case 'list_skills': {
            const filter = (args?.filter as string) || undefined;
            const source = (args?.source as 'all' | 'repository' | 'local') || 'all';

            const skills = this.executor.listSkills(filter, source);
            const lastSync = this.registry.getLastSync();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    skills,
                    total: skills.length,
                    lastSync: lastSync?.toISOString(),
                  }),
                },
              ],
            };
          }

          case 'get_skill': {
            const skillId = args?.skill_id as string;
            if (!skillId) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: {
                        code: 'InvalidParams',
                        message: 'Missing required parameter: skill_id',
                      },
                    }),
                  },
                ],
                isError: true,
              };
            }

            const result = await this.executor.getSkillDocumentation(skillId);
            const skill = this.executor.getSkill(skillId);

            if (!result.success || !skill) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result),
                  },
                ],
                isError: true,
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    id: skill.id,
                    name: skill.name,
                    description: skill.description,
                    content: result.content,
                    source: skill.source,
                    parameters: skill.parameters,
                    metadata: skill.metadata,
                  }),
                },
              ],
            };
          }

          case 'invoke_skill': {
            const skillId = args?.skill_id as string;
            const parameters = (args?.parameters as Record<string, unknown>) || {};

            if (!skillId) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      success: false,
                      error: {
                        code: 'InvalidParams',
                        message: 'Missing required parameter: skill_id',
                      },
                    }),
                  },
                ],
                isError: true,
              };
            }

            const result = await this.executor.invokeSkill(skillId, parameters);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result),
                },
              ],
              isError: !result.success,
            };
          }

          case 'refresh_skills': {
            if (this.onRefresh) {
              const result = await this.onRefresh();
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result),
                  },
                ],
                isError: !result.success,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    message: 'Skills refresh triggered. Use list_skills to see updated skills.',
                  }),
                },
              ],
            };
          }

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    error: {
                      code: 'ExecutionError',
                      message: `Unknown tool: ${name}`,
                    },
                  }),
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        logger.error(`Error handling tool call ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: {
                  code: 'InternalError',
                  message: error instanceof Error ? error.message : String(error),
                },
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP server started on stdio transport');
  }

  async stop(): Promise<void> {
    await this.server.close();
    logger.info('MCP server stopped');
  }

  notifyToolsChanged(): void {
    // This would notify connected clients that tools have changed
    // The MCP SDK handles this automatically when we have listChanged capability
    logger.debug('Notifying clients of tools change');
  }
}
