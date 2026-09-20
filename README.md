# TheTabber Agent Plugin

Give any AI agent the ability to post, schedule, and manage social media across 9 platforms
(TikTok, Instagram, YouTube, Facebook, X, LinkedIn, Pinterest, Threads, Bluesky) through
[TheTabber](https://thetabber.com).

This repo is packaged two ways so it works everywhere:

- Agent Plugin, following the [agent-plugins.org](https://agent-plugins.org) spec:
  `plugin.json`, `mcp.json`, and an Agent Skill, for clients that support the standard.
- MCP server on npm (`@thetabber/mcp`), for Claude Desktop, Claude Code, Cursor, or any MCP
  client, via `npx`.

## Layout

```
plugin.json            # Agent Plugin manifest
mcp.json               # Declares the TheTabber MCP server (npx @thetabber/mcp)
skills/agent-mode/     # Agent Skill: the connect, upload, post, verify workflow
mcp-server/            # Source for the @thetabber/mcp npm package (stdio MCP server)
```

## Prerequisites

- Node.js 18+
- A TheTabber API key (`ttbr_live_…`) from
  [thetabber.com/dashboard/settings/api-keys](https://thetabber.com/dashboard/settings/api-keys)
- At least one connected social account

Set your key in the environment:

```bash
export TABBER_API_KEY=ttbr_live_…
```

## Quick start (MCP)

Claude Code:

```bash
claude mcp add thetabber --env TABBER_API_KEY=$TABBER_API_KEY -- npx -y @thetabber/mcp
```

Claude Desktop or Cursor. Add to the client's MCP config:

```json
{
  "mcpServers": {
    "thetabber": {
      "command": "npx",
      "args": ["-y", "@thetabber/mcp"],
      "env": { "TABBER_API_KEY": "ttbr_live_…" }
    }
  }
}
```

See [`mcp-server/README.md`](./mcp-server/README.md) for the full tool list and details.

## As an Agent Plugin

Clients that implement the [Agent Plugins](https://agent-plugins.org) spec can consume this
repo directly. `plugin.json` describes the plugin, `mcp.json` wires up the MCP server, and
`skills/agent-mode` provides the workflow skill. The client handles installation and
enablement.

## Develop the MCP server

```bash
cd mcp-server
npm install
npm run build
TABBER_API_KEY=ttbr_live_… node dist/index.js
```

## License

MIT
