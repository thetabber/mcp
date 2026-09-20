# @thetabber/mcp

The official [Model Context Protocol](https://modelcontextprotocol.io) server for
[TheTabber](https://thetabber.com). It lets any MCP-capable AI agent (Claude Desktop,
Claude Code, Cursor, Windsurf, or your own) post, schedule, and manage social media across
9 platforms (TikTok, Instagram, YouTube, Facebook, X, LinkedIn, Pinterest, Threads,
Bluesky) through natural language.

Every tool maps 1:1 to the [TheTabber REST API](https://thetabber.com/docs/api).

## Prerequisites

- Node.js 18+
- A TheTabber API key. Create one at
  [thetabber.com/dashboard/settings/api-keys](https://thetabber.com/dashboard/settings/api-keys);
  keys look like `ttbr_live_…`.
- At least one connected social account

## Tools

| Tool | Endpoint |
| --- | --- |
| `whoami` | `GET /v1/me` |
| `list_social_accounts` | `GET /v1/social-accounts` |
| `get_social_account` | `GET /v1/social-accounts/{id}` |
| `list_posts` | `GET /v1/posts` |
| `create_post` | `POST /v1/posts` |
| `get_post` | `GET /v1/posts/{id}` |
| `update_post` | `PATCH /v1/posts/{id}` |
| `cancel_post` | `DELETE /v1/posts/{id}` |
| `upload_media` | `POST /v1/media/create-upload-url` (+ PUT) |
| `list_media` | `GET /v1/media` |
| `get_media` | `GET /v1/media/{id}` |
| `delete_media` | `DELETE /v1/media/{id}` |
| `list_post_results` | `GET /v1/post-results` |
| `get_post_result` | `GET /v1/post-results/{id}` |

## Configuration

The server reads two environment variables:

- `TABBER_API_KEY` (required): your `ttbr_live_…` key.
- `TABBER_BASE_URL` (optional): defaults to `https://thetabber.com`.

### Claude Code

```bash
claude mcp add thetabber --env TABBER_API_KEY=ttbr_live_xxx -- npx -y @thetabber/mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thetabber": {
      "command": "npx",
      "args": ["-y", "@thetabber/mcp"],
      "env": { "TABBER_API_KEY": "ttbr_live_xxx" }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "thetabber": {
      "command": "npx",
      "args": ["-y", "@thetabber/mcp"],
      "env": { "TABBER_API_KEY": "ttbr_live_xxx" }
    }
  }
}
```

## Local development

```bash
npm install
npm run build
TABBER_API_KEY=ttbr_live_xxx node dist/index.js
```

Inspect the tools interactively:

```bash
TABBER_API_KEY=ttbr_live_xxx npx @modelcontextprotocol/inspector node dist/index.js
```

## Example prompts

> "Post 'New drop is live' with `~/clips/launch.mp4` to all my connected accounts."

> "Schedule this image to Instagram and TikTok for 9am tomorrow in America/New_York."

> "Did my last post go out everywhere? Show me any failures."

## License

MIT
