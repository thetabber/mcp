# TheTabber for AI agents

Let your AI post for you. Connect this to Claude, Cursor, or any MCP client, and you can ask
it to publish or schedule content across your social accounts (TikTok, Instagram, YouTube,
Facebook, X, LinkedIn, Pinterest, Threads, Bluesky) through [TheTabber](https://thetabber.com).

Things you can ask once it is set up:

- "Which social accounts do I have connected?"
- "Post this photo to Instagram and TikTok with the caption 'launch day'."
- "Schedule 'new episode is out' to all my accounts for 9am Monday, New York time."
- "Did my last post actually go out everywhere? Show me anything that failed."

## Setup (about 2 minutes)

1. Create a [TheTabber](https://thetabber.com) account and connect at least one social account
   in the dashboard. The agent can only post to accounts you have already connected.
2. Create an API key at
   [thetabber.com/dashboard/settings/api-keys](https://thetabber.com/dashboard/settings/api-keys).
   It looks like `ttbr_live_…`. Keep it private.

You will need Node.js 18 or newer installed (the server runs via `npx`).

## Install

Pick the client you use. In each case, swap in your real `ttbr_live_…` key.

### Claude Code

```bash
claude mcp add thetabber --scope user --env TABBER_API_KEY=ttbr_live_… -- npx -y @thetabber/mcp
```

`--scope user` makes the server available in every directory. Without it, the server only
loads inside the folder where you ran the command. Restart Claude Code after adding, then run
`/mcp` to confirm `thetabber` is connected.

### Claude Desktop

Open Settings, then Developer, then Edit Config, and add this to the `mcpServers` object:

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

Restart Claude Desktop.

### Cursor

Create `.cursor/mcp.json` in your project (or add to the existing one):

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

### Any other MCP client

Run `npx -y @thetabber/mcp` as a stdio server with `TABBER_API_KEY` set in its environment.

## First run

Ask your agent: "Which social accounts do I have connected?" If it lists your accounts, you
are ready. Then try a real request like "Post 'hello from my AI' to my X account."

The agent will ask whether to post now or schedule it, publish to the accounts you name, and
tell you which ones succeeded.

## What it can do

- Post to one account or all of them at once.
- Publish immediately, or schedule for a specific time and timezone.
- Upload a local file or a public image or video URL (one video or up to 10 images per post).
- Edit or cancel a scheduled post before it runs.
- Report per-account results, so you know exactly what posted and what failed, and why.

For the full list of tools and the endpoints they map to, see
[`mcp-server/README.md`](./mcp-server/README.md).

## Troubleshooting

- "TABBER_API_KEY is not set": the key did not reach the server. Recheck the `env` value in
  your config, or the `--env` flag for Claude Code.
- "No accounts" or an empty list: connect a social account in the TheTabber dashboard first.
- `npx` fails to start: make sure Node.js 18+ is installed (`node --version`).
- The agent does not see the server or has no posting tools: add it with `--scope user` and
  restart Claude Code. MCP servers only load at session startup, and a project-scoped server
  loads only inside that folder.
- A post fails on one platform: the others still go out. Ask the agent to show the failure
  reason; rate limits and media requirements are the usual causes.

## Other ways to use it

- **REST API.** Call TheTabber directly from any language. See
  [the API docs](https://thetabber.com/docs/api) and the OpenAPI spec at
  [`/v1/openapi.json`](https://thetabber.com/v1/openapi.json).
- **Agent Plugin.** This repo follows the [agent-plugins.org](https://agent-plugins.org) spec
  (`plugin.json` + `mcp.json` + `skills/`), so clients that support it can install everything
  in one step.

## License

MIT
