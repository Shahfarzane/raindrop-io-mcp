# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raindrop.io MCP is an MCP (Model Context Protocol) server built with the [xmcp](https://xmcp.dev/docs) framework. It provides AI assistants with tools to manage Raindrop.io bookmarks, including collections, tags, highlights, and an experimental X.com bookmark import feature.

## Commands

```bash
# Development - starts MCP server with hot reload
bun run dev

# Build for production
bun run build

# Start production server (HTTP)
bun start
```

## Architecture

This project uses xmcp's file-based routing where tools, prompts, and resources are auto-discovered from their directories configured in `xmcp.config.ts`.

### Directory Structure

```
src/
  lib/                    # Shared utilities
    auth.ts               # Raindrop.io OAuth
    raindrop-client.ts    # Raindrop.io API client
    response-shaper.ts    # Response transformation for token efficiency
    types.ts              # TypeScript types for Raindrop.io
    collection-utils.ts   # Shared collection helpers
    x-auth.ts             # X.com OAuth with PKCE
    x-client.ts           # X.com API client with rate limiting
    x-import-state.ts     # Import state persistence
    x-types.ts            # TypeScript types for X.com
  tools/                  # MCP tools (32 total)
    auth/                 # Authentication tools
    collections/          # Collection CRUD + organization
    raindrops/            # Bookmark CRUD + bulk operations
    tags/                 # Tag management
    analysis/             # Library analysis + AI tagging
    filters/              # Filter statistics
    highlights/           # Highlight management
    x/                    # X.com import (experimental)
  prompts/                # MCP prompts (4 total)
  resources/              # MCP resources (1 total)
```

### Component Structure

Each component (tool/prompt/resource) follows the same pattern:
1. `schema` - Zod object defining parameters
2. `metadata` - Name, description, and type-specific options
3. `default export` - Handler function implementing the logic

**Tools** (`src/tools/`): Actions that can be invoked. Use `ToolMetadata` with `annotations` for hints (readOnly, destructive, idempotent).

**Prompts** (`src/prompts/`): Template definitions for AI interactions. Use `PromptMetadata` with `role` field.

**Resources** (`src/resources/`): URI-based data access using folder-based routing:
- `(parentheses)` - URI scheme prefix (e.g., `(raindrop)/` -> `raindrop://`)
- `[brackets]` - Dynamic parameters (e.g., `[id]/` captures id)
- File becomes the path (e.g., `(raindrop)/[id]/index.ts` -> `raindrop://{id}`)

### Key Types from xmcp

```typescript
import type { ToolMetadata, PromptMetadata, ResourceMetadata, InferSchema } from "xmcp";
```

Use `InferSchema<typeof schema>` to type handler parameters from the Zod schema.

### Response Shaping

Use `src/lib/response-shaper.ts` to control response size with field levels:
- `minimal` - Just id and title
- `summary` - Basic fields for listings
- `standard` - Common fields for most operations
- `full` - All fields including media, highlights, etc.

### Authentication

Tokens are stored in `~/.raindrop-mcp/`:
- `tokens.json` - Raindrop.io OAuth tokens
- `x-tokens.json` - X.com OAuth tokens
- `x-pkce.json` - X.com PKCE state
- `import-state/` - X.com import state files
