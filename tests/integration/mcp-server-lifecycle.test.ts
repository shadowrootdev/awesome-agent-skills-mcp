import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: object;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: object;
  error?: {
    code: number;
    message: string;
  };
}

class MCPTestClient {
  private process: ChildProcess;
  private requestId = 0;
  private pendingRequests = new Map<number, (response: JSONRPCResponse) => void>();
  private buffer = '';

  constructor(serverPath: string) {
    this.process = spawn('node', [serverPath], {
      env: {
        ...process.env,
        LOG_LEVEL: 'error',
        SKILLS_SYNC_INTERVAL: '0',
      },
    });

    this.process.stdout?.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.process.stderr?.on('data', (data) => {
      // Only log actual errors, not warnings
      const msg = data.toString();
      if (msg.includes('[ERROR]')) {
        console.error('Server error:', msg);
      }
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line) as JSONRPCResponse;
          const resolver = this.pendingRequests.get(response.id);
          if (resolver) {
            this.pendingRequests.delete(response.id);
            resolver(response);
          }
        } catch {
          // Not valid JSON, ignore
        }
      }
    }
  }

  async sendRequest(method: string, params?: object): Promise<JSONRPCResponse> {
    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out`));
      }, 10000);

      this.pendingRequests.set(id, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.process.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  async initialize(): Promise<JSONRPCResponse> {
    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    });
  }

  async listTools(): Promise<JSONRPCResponse> {
    return this.sendRequest('tools/list');
  }

  async callTool(name: string, args?: object): Promise<JSONRPCResponse> {
    return this.sendRequest('tools/call', {
      name,
      arguments: args,
    });
  }

  kill(): void {
    this.process.kill();
  }
}

describe('MCP Server Full Lifecycle', () => {
  let client: MCPTestClient;
  const serverPath = join(__dirname, '../../dist/index.js');

  beforeAll(async () => {
    client = new MCPTestClient(serverPath);
  });

  afterAll(() => {
    client.kill();
  });

  describe('Server Initialization', () => {
    it('should respond to initialize request', async () => {
      const response = await client.initialize();

      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('protocolVersion');
      expect(response.result).toHaveProperty('serverInfo');
      expect(response.result?.serverInfo).toHaveProperty('name', 'awesome-agent-skills-mcp');
      expect(response.result?.serverInfo).toHaveProperty('version', '1.0.0');
    });
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const response = await client.listTools();

      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result?.tools)).toBe(true);
      
      const tools = response.result?.tools as Array<{ name: string; description: string }>;
      const toolNames = tools.map((t) => t.name);
      
      expect(toolNames).toContain('list_skills');
      expect(toolNames).toContain('get_skill');
      expect(toolNames).toContain('invoke_skill');
      expect(toolNames).toContain('refresh_skills');
    });

    it('should have tools with proper schemas', async () => {
      const response = await client.listTools();
      const tools = response.result?.tools as Array<{
        name: string;
        inputSchema: object;
        outputSchema?: object;
        annotations?: object;
      }>;

      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        
        // Check for output schemas (new feature)
        if (tool.outputSchema) {
          expect(tool.outputSchema).toHaveProperty('type', 'object');
        }
        
        // Check for annotations
        if (tool.annotations) {
          expect(typeof tool.annotations).toBe('object');
        }
      }
    });
  });

  describe('Tool Execution', () => {
    it('should list skills successfully', async () => {
      const response = await client.callTool('list_skills');

      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('content');
      expect(Array.isArray(response.result?.content)).toBe(true);

      const content = response.result?.content as Array<{ type: string; text: string }>;
      expect(content.length).toBeGreaterThan(0);
      expect(content[0]).toHaveProperty('type', 'text');

      // Parse the JSON response
      const data = JSON.parse(content[0].text);
      expect(data).toHaveProperty('skills');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.skills)).toBe(true);
      expect(typeof data.total).toBe('number');
    });

    it('should filter skills by source', async () => {
      const response = await client.callTool('list_skills', { source: 'repository' });

      expect(response).toHaveProperty('result');
      const content = response.result?.content as Array<{ type: string; text: string }>;
      const data = JSON.parse(content[0].text);
      
      expect(data).toHaveProperty('skills');
      expect(data).toHaveProperty('total');
    });

    it('should return error for non-existent skill', async () => {
      const response = await client.callTool('get_skill', { skill_id: 'non-existent-skill-12345' });

      expect(response).toHaveProperty('result');
      const result = response.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      const content = result.content;
      
      // Check isError at the result level
      expect(result.isError).toBe(true);
      
      const data = JSON.parse(content[0].text);
      expect(data.success).toBe(false);
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });

    it('should return error for missing required parameter', async () => {
      const response = await client.callTool('get_skill', {});

      expect(response).toHaveProperty('result');
      const result = response.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      const content = result.content;
      
      // Check isError at the result level
      expect(result.isError).toBe(true);
      
      const data = JSON.parse(content[0].text);
      expect(data.success).toBe(false);
    });

    it('should refresh skills successfully', async () => {
      const response = await client.callTool('refresh_skills');

      expect(response).toHaveProperty('result');
      const content = response.result?.content as Array<{ type: string; text: string }>;
      const data = JSON.parse(content[0].text);
      
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('message');
      expect(typeof data.success).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool gracefully', async () => {
      const response = await client.callTool('unknown_tool');

      expect(response).toHaveProperty('result');
      const result = response.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      const content = result.content;
      
      // Check isError at the result level
      expect(result.isError).toBe(true);
      
      const data = JSON.parse(content[0].text);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ExecutionError');
    });
  });
});
