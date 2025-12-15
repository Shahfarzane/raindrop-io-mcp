# Raindrop.io MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for managing [Raindrop.io](https://raindrop.io) bookmarks through AI assistants like Claude.

## Features

- **Full Raindrop.io API** - Collections, bookmarks, tags, highlights, filters
- **AI-Powered Tagging** - Intelligent tag suggestions with customizable prompts
- **Library Analysis** - Overview stats, untagged items, organization suggestions
- **X.com Import** *(Experimental)* - Import Twitter/X bookmarks via API or JSON export
- **Token Efficient** - Configurable response detail levels (minimal/summary/standard/full)
- **Secure OAuth** - Auto-refreshing tokens with PKCE support for X.com

## Quick Start

### Prerequisites

- Node.js 20+
- [Raindrop.io](https://raindrop.io) account
- API credentials from [Raindrop.io Integrations](https://app.raindrop.io/settings/integrations)

### Installation

```bash
git clone https://github.com/Shahfarzane/raindrop-io-mcp.git
cd raindrop-io-mcp
npm install
cp .env.example .env
# Edit .env with your credentials
```

### Configuration

Create a `.env` file with your Raindrop.io OAuth credentials:

```env
RAINDROP_CLIENT_ID=your_client_id
RAINDROP_CLIENT_SECRET=your_client_secret
RAINDROP_REDIRECT_URI=http://localhost:3000/callback
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

### MCP Client Setup

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "raindrop": {
      "url": "http://localhost:4857/mcp"
    }
  }
}
```

## Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Auth** | `authenticate`, `get_auth_url`, `exchange_auth_code` | OAuth authentication flow |
| **Collections** | `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` | Manage bookmark collections |
| **Raindrops** | `search_raindrops`, `get_raindrop`, `create_raindrop`, `update_raindrop`, `delete_raindrop`, `bulk_update_raindrops` | CRUD operations for bookmarks |
| **Tags** | `list_tags`, `manage_tags` | List, rename, merge, delete tags |
| **Analysis** | `get_library_overview`, `analyze_untagged`, `suggest_tags`, `auto_tag_raindrop`, `batch_apply_tags` | Library insights and AI tagging |
| **Organization** | `bulk_move_by_tag`, `organize_by_tags` | Bulk organization tools |
| **Other** | `get_filters`, `list_highlights`, `get_featured_covers`, `search_collection_covers` | Filters, highlights, icons |
| **X.com** *(Experimental)* | `x_authenticate`, `import_x_bookmarks`, `import_x_from_file`, `check_x_import` | Import Twitter/X bookmarks |

## Prompts

| Prompt | Description |
|--------|-------------|
| `generate-tags` | Analyze bookmark metadata and generate relevant tags |
| `batch-tag-items` | Process multiple bookmarks for batch tagging |
| `organize-collection` | Analyze and suggest collection improvements |
| `suggest-collection-structure` | Create hierarchy suggestions from tags |

## Resources

| URI Pattern | Description |
|-------------|-------------|
| `raindrop://{id}` | Direct access to raindrop by ID |

## X.com Import (Experimental)

Import your Twitter/X bookmarks into Raindrop.io. Requires separate X.com API credentials.

```env
# Add to .env for X.com import
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=http://localhost:3001/callback
```

Supports:
- API import with rate limiting and resume capability
- Local JSON file import from browser extensions

## Development

```bash
npm run dev      # Start with hot reload
npm run build    # Build for production
npm start        # Run production server
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[MIT](LICENSE) © Shahfarzane
