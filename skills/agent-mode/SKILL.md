---
name: thetabber-agent-mode
description: >-
  Post, schedule, and manage social media across 9 platforms (TikTok, Instagram,
  YouTube, Facebook, X, LinkedIn, Pinterest, Threads, Bluesky) through TheTabber.
  Use when the user wants to publish content, schedule posts, upload media, or
  check whether a post went out, via TheTabber's API or MCP server.
license: MIT
---

# TheTabber Agent Mode

This skill teaches you to drive [TheTabber](https://thetabber.com), a multi-platform social
media publisher, on the user's behalf.

## Two ways to connect

1. MCP server (preferred). If the `thetabber` MCP server is available, use its tools
   directly (`list_social_accounts`, `create_post`, `upload_media`, `list_post_results`, and
   so on). Install it with:
   `claude mcp add thetabber --env TABBER_API_KEY=ttbr_live_xxx -- npx -y @thetabber/mcp`
2. REST API. Otherwise call the HTTP API. Base URL `https://thetabber.com`. Authenticate
   every request with `Authorization: Bearer $TABBER_API_KEY`. Full reference:
   https://thetabber.com/docs/api. OpenAPI: https://thetabber.com/v1/openapi.json

The API key comes from https://thetabber.com/dashboard/settings/api-keys and looks like
`ttbr_live_…`. Never print or log the key.

## Core workflow

1. Confirm the key works with `GET /v1/me` (MCP: `whoami`).
2. Find the target accounts with `GET /v1/social-accounts` (MCP: `list_social_accounts`).
   Save the account UUIDs; you need them to post. If none are connected, tell the user to
   connect accounts in the dashboard first.
3. Attach media if needed. For a local file or a URL, create an upload and PUT the bytes
   (MCP: `upload_media`), then use the returned media UUID. One video or up to 10 images per
   post. You can also pass `media_urls` (public URLs) instead of uploading.
4. Create the post with `POST /v1/posts` (MCP: `create_post`). Omit `scheduled_at` to
   publish now, or set an ISO 8601 future timestamp (plus an optional `timezone`) to schedule.
5. Verify with `GET /v1/post-results` (MCP: `list_post_results`) to confirm each account
   posted, or to surface per-account failures with their reasons.

## Create-post fields

- `social_accounts` (required): array of account UUIDs to publish to.
- `caption`: text applied to every platform unless overridden.
- `media`: array of media UUIDs from step 3.
- `media_urls`: public URLs you already host (ignored if `media` is set).
- `scheduled_at`: ISO 8601 future time; omit to publish immediately.
- `timezone`: IANA zone for `scheduled_at` (defaults to UTC).
- `platform_configurations`: per-platform overrides (see docs).

## Example (REST)

```bash
curl https://thetabber.com/v1/posts \
  -H "Authorization: Bearer $TABBER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "New drop is live",
    "social_accounts": ["acct_123", "acct_456"],
    "media": ["media_789"],
    "scheduled_at": "2026-10-01T09:00:00Z"
  }'
```

## Guardrails

- Always resolve real account UUIDs from `list_social_accounts`; never guess IDs.
- Confirm the destination accounts and timing with the user before publishing immediately.
- Keep to one video or up to 10 images per post.
- After posting, check `post-results` and report any account that failed, with the reason.
- Treat the API key as a secret.
