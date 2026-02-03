# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-20

### Added

- Initial release of Awesome Agent Skills MCP Server
- **100+ curated skills** from leading organizations:
  - Anthropic (document processing, algorithmic art, MCP building)
  - Vercel (React, Next.js best practices, web design)
  - Trail of Bits (security analysis, smart contracts, Semgrep)
  - Hugging Face (ML workflows, model training, datasets)
  - Sentry (code review, commit conventions, PR automation)
  - Stripe (payment integrations)
  - Expo (React Native development)
  - n8n (workflow automation)
  - Sanity (CMS best practices)
  - Neon (serverless Postgres)
  - Remotion (programmatic video)
  - And many more!

- **4 MCP tools**:
  - `list_skills` - List all available skills with optional filtering by source or tag
  - `get_skill` - Get detailed information about a specific skill
  - `invoke_skill` - Invoke a skill with optional parameters
  - `refresh_skills` - Manually trigger a skills refresh from the repository

- **MCP 2024-11-05 compliance** - Full compatibility with the latest Model Context Protocol specification

- **Multi-client support**:
  - GitHub Copilot (VS Code)
  - Claude Desktop
  - OpenCode
  - Any MCP-compatible client

- **Smart caching** - JSON-based caching for fast startup times
- **Auto-sync** - Automatically fetches and updates skills from VoltAgent repository
- **Zero configuration** - Works out of the box with `npx awesome-agent-skills-mcp`
- **TypeScript** - Full type safety with Zod runtime validation

### Technical Details

- Built with TypeScript and compiled to ES2022
- Uses `@modelcontextprotocol/sdk` for MCP implementation
- Uses `simple-git` for repository synchronization
- Uses `zod` for schema validation
- Supports Node.js 20+

[1.0.0]: https://github.com/shadowrootdev/awesome-agent-skills-mcp/releases/tag/v1.0.0
