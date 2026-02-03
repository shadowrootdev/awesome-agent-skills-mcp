# Contributing to Awesome Agent Skills MCP

Thank you for your interest in contributing! This document provides guidelines and steps for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/shadowrootdev/awesome-agent-skills-mcp/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, OS, MCP client)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and its use case
3. Explain why it would be valuable

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit with conventional commits: `git commit -m 'feat: add my feature'`
7. Push: `git push origin feature/my-feature`
8. Open a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/shadowrootdev/awesome-agent-skills-mcp.git
cd awesome-agent-skills-mcp

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Use TypeScript
- Follow ESLint rules
- Use Prettier for formatting
- Write tests for new features

## Questions?

Feel free to open an issue for any questions!
