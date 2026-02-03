import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MCP Server Integration', () => {
  let serverProcess: ReturnType<typeof spawn>;

  it('should start the MCP server and respond to initialize', async () => {
    const serverPath = join(__dirname, '../../dist/index.js');
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        LOG_LEVEL: 'error', // Reduce noise during tests
        SKILLS_SYNC_INTERVAL: '0', // Disable auto-sync for tests
      },
    });

    const responsePromise = new Promise<object>((resolve, reject) => {
      let buffer = '';
      
      serverProcess.stdout?.on('data', (data) => {
        buffer += data.toString();
        
        // Try to parse JSON-RPC responses
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === 1) {
                resolve(response);
                return;
              }
            } catch {
              // Not valid JSON yet, continue buffering
            }
          }
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        // Log stderr for debugging
        console.error('Server stderr:', data.toString());
      });

      serverProcess.on('error', reject);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Timeout waiting for server response'));
      }, 30000);
    });

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
      },
    };

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    serverProcess.stdin?.write(JSON.stringify(initRequest) + '\n');

    const response = await responsePromise;
    
    expect(response).toHaveProperty('result');
    expect(response.result).toHaveProperty('protocolVersion');
    expect(response.result).toHaveProperty('serverInfo');
    
    // Clean up
    serverProcess.kill();
  }, 20000);
});
