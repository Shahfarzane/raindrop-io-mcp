# Contributing to Raindrop.io MCP

Thanks for your interest in contributing!

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shahfarzane/raindrop-io-mcp.git
   cd raindrop-io-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Raindrop.io API credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
  lib/           # Shared utilities (auth, API client, types)
  tools/         # MCP tool implementations
  prompts/       # MCP prompt templates
  resources/     # MCP resource handlers
```

## Code Style

- TypeScript strict mode is enabled
- Run `npm run build` before committing to catch type errors

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run build` to verify
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Check existing issues before creating a new one
