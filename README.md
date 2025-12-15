# Raindrop.io MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for managing [Raindrop.io](https://raindrop.io) bookmarks through AI assistants like Claude.

## Features

- **Full Raindrop.io API** - Collections, bookmarks, tags, highlights, filters
- **AI-Powered Tagging** - Intelligent tag suggestions with customizable prompts
- **Library Analysis** - Overview stats, untagged items, organization suggestions
- **X.com Import** *(Experimental)* - Import Twitter/X bookmarks via API or JSON export
- **Token Efficient** - Configurable response detail levels (minimal/summary/standard/full)
- **Secure OAuth** - Auto-refreshing tokens, auto-opens browser for authorization

## Quick Start

### Prerequisites

- Node.js 20+
- [Raindrop.io](https://raindrop.io) account

### Installation

```bash
git clone https://github.com/Shahfarzane/raindrop-io-mcp.git
cd raindrop-io-mcp
npm install
cp .env.example .env
```

## Setup

### Step 1: Create Raindrop.io App

1. Go to [Raindrop.io Integrations](https://app.raindrop.io/settings/integrations)
2. Click **"Create new app"**
3. Fill in app details:
   - **Name:** Your app name (e.g., "My MCP Server")
   - **Redirect URI:** `http://localhost:3000/callback`
4. After creating, copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment

Edit `.env` with your credentials:

```env
RAINDROP_CLIENT_ID=your_client_id
RAINDROP_CLIENT_SECRET=your_client_secret
RAINDROP_REDIRECT_URI=http://localhost:3000/callback
```

> **Important:** The redirect URI must match exactly what you entered in Raindrop.io settings.

### Step 3: Start the Server

```bash
# Build and start
npm run build
npm start
```

The server runs on **two ports**:

| Port | Purpose |
|------|---------|
| `3001` | MCP server endpoint (`/mcp`) - for AI assistants |
| `3000` | OAuth callback (temporary) - only active during authentication |

### Step 4: Authenticate

On first use, you need to authenticate with Raindrop.io:

1. Call the `authenticate` tool via your MCP client
2. **Your browser opens automatically** to the Raindrop.io authorization page
3. Authorize the application
4. The callback is captured automatically and you're ready to go!

Tokens are stored in `~/.raindrop-mcp/tokens.json` and auto-refresh when expired.

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "raindrop": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### Other MCP Clients

Point your MCP client to: `http://localhost:3001/mcp`

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

Import your Twitter/X bookmarks into Raindrop.io.

### Setup

1. Create an app at [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Enable **OAuth 2.0** with these settings:
   - **Type:** Confidential client (or Public with PKCE)
   - **Redirect URI:** `http://localhost:3001/callback`
   - **Scopes:** `tweet.read`, `users.read`, `bookmark.read`, `offline.access`

3. Add to `.env`:

```env
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=http://localhost:3001/callback
```

### Usage

1. Call `x_authenticate` - browser opens automatically for authorization
2. Call `import_x_bookmarks` to import (supports resume on interruption)
3. Or use `import_x_from_file` with a JSON export from browser extensions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Port 3001: MCP Protocol (always running)               │
│   └── POST /mcp - JSON-RPC endpoint for AI assistants    │
│                                                          │
│   Port 3000: Raindrop OAuth Callback (on-demand)         │
│   └── GET /callback - temporary, during authentication   │
│                                                          │
│   Port 3001: X.com OAuth Callback (on-demand)            │
│   └── GET /callback - temporary, during X authentication │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Token Storage

Tokens are stored in `~/.raindrop-mcp/`:

| File | Purpose |
|------|---------|
| `tokens.json` | Raindrop.io OAuth tokens |
| `x-tokens.json` | X.com OAuth tokens |
| `x-pkce.json` | X.com PKCE state (temporary) |
| `import-state/` | X.com import progress (for resume) |

## Development

```bash
npm run dev      # Start with hot reload
npm run build    # Build for production
npm start        # Run production server
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## Troubleshooting

### "Not authenticated" error
Run the `authenticate` tool first to connect your Raindrop.io account.

### Browser doesn't open automatically
If the browser doesn't open, the authorization URL is printed in the console. Copy and paste it into your browser manually.

### OAuth callback fails
Ensure the redirect URI in your `.env` matches exactly what's configured in Raindrop.io settings (including trailing slashes).

### Port already in use
The OAuth callback uses port 3000 temporarily. Close any other servers on that port before authenticating.

## License

[MIT](LICENSE) © Shahfarzane
