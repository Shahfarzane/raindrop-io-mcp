# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raindrop is an MCP (Model Context Protocol) server built with the [xmcp](https://xmcp.dev/docs) framework. It exposes tools, prompts, and resources via HTTP transport for AI interactions.

## Commands

```bash
# Development - starts MCP server with hot reload
npm run dev

# Build for production
npm run build

# Start production server (HTTP)
npm run start
```

## Architecture

This project uses xmcp's file-based routing where tools, prompts, and resources are auto-discovered from their directories configured in `xmcp.config.ts`.

### Component Structure

Each component (tool/prompt/resource) follows the same pattern:
1. `schema` - Zod object defining parameters
2. `metadata` - Name, description, and type-specific options
3. `default export` - Handler function implementing the logic

**Tools** (`src/tools/`): Actions that can be invoked. Use `ToolMetadata` with `annotations` for hints (readOnly, destructive, idempotent).

**Prompts** (`src/prompts/`): Template definitions for AI interactions. Use `PromptMetadata` with `role` field.

**Resources** (`src/resources/`): URI-based data access using folder-based routing:
- `(parentheses)` - URI scheme prefix (e.g., `(config)/` → `config://`)
- `[brackets]` - Dynamic parameters (e.g., `[userId]/` captures userId)
- File becomes the path (e.g., `(users)/[userId]/index.ts` → `users://{userId}`)

### Key Types from xmcp

```typescript
import { type ToolMetadata, type PromptMetadata, type ResourceMetadata, type InferSchema } from "xmcp";
```

Use `InferSchema<typeof schema>` to type handler parameters from the Zod schema.
