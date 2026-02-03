# Awesome Agent Skills MCP Server

[![CI](https://github.com/shadowrootdev/awesome-agent-skills-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shadowrootdev/awesome-agent-skills-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/awesome-agent-skills-mcp.svg)](https://www.npmjs.com/package/awesome-agent-skills-mcp)
[![npm downloads](https://img.shields.io/npm/dm/awesome-agent-skills-mcp.svg)](https://www.npmjs.com/package/awesome-agent-skills-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/awesome-agent-skills-mcp.svg)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-2024--11--05-blue.svg)](https://modelcontextprotocol.io)
[![GitHub release](https://img.shields.io/github/v/release/shadowrootdev/awesome-agent-skills-mcp)](https://github.com/shadowrootdev/awesome-agent-skills-mcp/releases)
[![GitHub stars](https://img.shields.io/github/stars/shadowrootdev/awesome-agent-skills-mcp)](https://github.com/shadowrootdev/awesome-agent-skills-mcp/stargazers)

> **A Model Context Protocol (MCP) server that provides access to 100+ curated AI agent skills from the [VoltAgent Awesome Agent Skills](https://github.com/VoltAgent/awesome-agent-skills) collection.**

Transform your AI assistants into specialized experts with skills from Anthropic, Vercel, Trail of Bits, Hugging Face, Stripe, Expo, and many more leading organizations.

## 🚀 Quick Start

```bash
npx awesome-agent-skills-mcp
```

That's it! Add to your MCP client config and start using 100+ AI skills.

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
  - [VS Code / GitHub Copilot](#vs-code--github-copilot)
  - [Claude Desktop](#claude-desktop)
  - [OpenCode](#opencode)
- [Available Skills](#available-skills)
- [MCP Tools](#mcp-tools)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Credits](#credits)
- [License](#license)

---

## Features

- **100+ Curated Skills** - Access skills from top organizations including Anthropic, Vercel, Trail of Bits, Hugging Face, and more
- **Auto-Sync** - Automatically fetches and updates skills from the VoltAgent repository
- **MCP 2024-11-05 Compliant** - Full compatibility with the latest Model Context Protocol specification
- **Multi-Client Support** - Works with Claude, GitHub Copilot, OpenCode, and any MCP-compatible client
- **Smart Caching** - Efficient JSON-based caching for fast startup times
- **Type-Safe** - Built with TypeScript and Zod for runtime validation
- **Zero Configuration** - Works out of the box with sensible defaults

---

## Quick Start

### Using npx (Recommended)

```bash
npx awesome-agent-skills-mcp
```

### Global Installation

```bash
npm install -g awesome-agent-skills-mcp
awesome-agent-skills-mcp
```

---

## Installation

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or **yarn**

### From npm

```bash
npm install awesome-agent-skills-mcp
```

### From Source

```bash
git clone https://github.com/shadowrootdev/awesome-agent-skills-mcp.git
cd awesome-agent-skills-mcp
npm install
npm run build
```

---

## Configuration

### VS Code / GitHub Copilot

Create or update `.vscode/mcp.json` in your project:

```json
{
  "servers": {
    "awesome-agent-skills": {
      "command": "npx",
      "args": ["awesome-agent-skills-mcp"]
    }
  }
}
```

Or with a local installation:

```json
{
  "servers": {
    "awesome-agent-skills": {
      "command": "node",
      "args": ["/path/to/awesome-agent-skills-mcp/dist/index.js"]
    }
  }
}
```

> **Important**: After adding the configuration, **fully quit VS Code** (Cmd+Q / Alt+F4) and reopen it for changes to take effect.

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "awesome-agent-skills": {
      "command": "npx",
      "args": ["awesome-agent-skills-mcp"]
    }
  }
}
```

### OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "awesome-agent-skills": {
      "type": "local",
      "command": ["npx", "awesome-agent-skills-mcp"],
      "enabled": true
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SKILLS_REPO_URL` | `https://github.com/VoltAgent/awesome-agent-skills.git` | Skills repository URL |
| `SKILLS_CACHE_DIR` | `.cache` | Cache directory path |
| `SKILLS_SYNC_INTERVAL` | `60` | Auto-sync interval in minutes (0 to disable) |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

---

## Available Skills

The server provides access to **100+ skills** from leading organizations:

### Anthropic
Document processing, presentation creation, spreadsheet manipulation, PDF handling, algorithmic art, MCP building, and more.

| Skill | Description |
|-------|-------------|
| `docx` | Create, edit, and analyze Word documents |
| `pptx` | PowerPoint presentation creation and editing |
| `xlsx` | Spreadsheet manipulation with formulas |
| `pdf` | PDF processing and form filling |
| `mcp-builder` | Guide for creating MCP servers |
| `webapp-testing` | Playwright-based web app testing |

### Vercel
React and Next.js best practices, deployment, and performance optimization.

| Skill | Description |
|-------|-------------|
| `react-best-practices` | React performance optimization guidelines |
| `next-best-practices` | Next.js conventions and patterns |
| `web-design-guidelines` | UI/UX compliance review |
| `vercel-deploy` | Deploy apps to Vercel |

### Trail of Bits
Security analysis, smart contract auditing, and code review tools.

| Skill | Description |
|-------|-------------|
| `building-secure-contracts` | Smart contract security toolkit |
| `semgrep-rule-creator` | Create custom Semgrep rules |
| `property-based-testing` | Property-based testing guidance |
| `static-analysis` | Static analysis tooling |

### Hugging Face
ML model training, dataset management, and Hub operations.

| Skill | Description |
|-------|-------------|
| `hugging-face-cli` | HF Hub CLI operations |
| `hugging-face-datasets` | Dataset creation and management |
| `hugging-face-model-trainer` | Model fine-tuning with TRL |
| `hugging-face-evaluation` | Model evaluation workflows |

### Sentry
Code review, commit conventions, and PR automation.

| Skill | Description |
|-------|-------------|
| `code-review` | Sentry engineering code review practices |
| `commit` | Conventional commit messages |
| `create-pr` | PR creation following Sentry conventions |
| `find-bugs` | Bug and vulnerability detection |

### And Many More...
- **Stripe** - Payment integration best practices
- **Expo** - React Native app development
- **n8n** - Workflow automation patterns
- **Sanity** - CMS best practices
- **Neon** - Serverless Postgres
- **Remotion** - Programmatic video creation

---

## MCP Tools

The server exposes four MCP tools:

### `list_skills`

List all available skills with optional filtering.

```typescript
// List all skills
{ }

// Filter by source
{ "source": "repository" }

// Filter by tag
{ "tag": "security" }
```

### `get_skill`

Get detailed information about a specific skill.

```typescript
{ "skill_id": "react-best-practices" }
```

### `invoke_skill`

Invoke a skill with optional parameters.

```typescript
{
  "skill_id": "docx",
  "parameters": {
    "document_type": "report"
  }
}
```

### `refresh_skills`

Manually trigger a skills refresh from the repository.

```typescript
{ }
```

---

## Usage Examples

### In GitHub Copilot Chat

```
@workspace Use the react-best-practices skill to review my React components
```

```
@workspace List all available security-related skills
```

```
@workspace Get the stripe-best-practices skill and apply it to my checkout code
```

### In Claude

```
What skills are available for Next.js development?
```

```
Use the code-review skill to analyze my pull request
```

---

## Development

### Setup

```bash
git clone https://github.com/shadowrootdev/awesome-agent-skills-mcp.git
cd awesome-agent-skills-mcp
npm install
```

### Build

```bash
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration
```

### Lint & Format

```bash
npm run lint
npm run format
```

### Project Structure

```
awesome-agent-skills-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── config.ts             # Configuration management
│   ├── models/
│   │   ├── skill.ts          # Skill type definitions
│   │   ├── parameter.ts      # Parameter schemas
│   │   ├── registry.ts       # SkillRegistry class
│   │   └── repository.ts     # Repository source model
│   ├── services/
│   │   ├── git-sync.ts       # Git repository sync
│   │   ├── skill-parser.ts   # Skill parsing from README
│   │   └── skill-executor.ts # Skill invocation
│   ├── cache/
│   │   └── cache-manager.ts  # JSON-based caching
│   └── utils/
│       └── logger.ts         # Structured logging
├── tests/
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── dist/                     # Compiled output
└── .cache/                   # Runtime cache (gitignored)
```

---

## API Reference

### Skill Object

```typescript
interface Skill {
  id: string;           // Unique identifier
  name: string;         // Display name
  description: string;  // Short description
  source: 'repository' | 'local';
  sourcePath: string;   // GitHub URL or local path
  content: string;      // Full skill content (markdown)
  parameters: ParameterSchema[];
  metadata: {
    author?: string;
    version?: string;
    tags?: string[];
    requirements?: string[];
    sourceOrg?: string;   // GitHub organization
    sourceRepo?: string;  // GitHub repository
  };
  lastUpdated: Date;
}
```

### Parameter Schema

```typescript
interface ParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
}
```

---

## Troubleshooting

### Skills Not Loading

1. **Check cache**: Delete `.cache` directory and restart
2. **Verify network**: Ensure access to GitHub
3. **Check logs**: Set `LOG_LEVEL=debug` for verbose output

### GitHub Copilot Not Seeing Skills

1. **Full restart required**: Quit VS Code completely (Cmd+Q) and reopen
2. **Check config path**: Ensure `.vscode/mcp.json` is in the workspace root
3. **Verify server**: Run `npx awesome-agent-skills-mcp` manually to test

### Connection Errors

```bash
# Test the server manually
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | npx awesome-agent-skills-mcp
```

---

## Credits

This project is built on top of the incredible work by the open-source community:

### Data Source

**[VoltAgent Awesome Agent Skills](https://github.com/VoltAgent/awesome-agent-skills)** - A curated collection of AI agent skills maintained by VoltAgent. This MCP server fetches and serves skills from this repository, making them accessible to MCP-compatible AI assistants.

### Skill Contributors

Skills in this collection are contributed by leading organizations including:

- [Anthropic](https://github.com/anthropics/skills) - Document processing, art generation, MCP building
- [Vercel](https://github.com/vercel-labs/agent-skills) - React, Next.js, deployment
- [Trail of Bits](https://github.com/trailofbits/skills) - Security analysis, smart contracts
- [Hugging Face](https://github.com/huggingface/skills) - ML workflows, model training
- [Sentry](https://github.com/getsentry/skills) - Code review, commit conventions
- [Expo](https://github.com/expo/skills) - React Native development
- [Stripe](https://github.com/stripe/skills) - Payment integrations
- And many more contributors!

### Technologies

- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol specification
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - Official TypeScript SDK
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [simple-git](https://github.com/steveukx/git-js) - Git operations

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Related Projects

- [VoltAgent](https://github.com/VoltAgent) - AI agent framework
- [Awesome Agent Skills](https://github.com/VoltAgent/awesome-agent-skills) - The source skill collection
- [MCP Servers](https://github.com/modelcontextprotocol/servers) - Official MCP server implementations

---

<p align="center">
  Made with ❤️ for the AI agent community
  <br>
  <a href="https://github.com/VoltAgent/awesome-agent-skills">⭐ Star the Awesome Agent Skills repository</a>
</p>
