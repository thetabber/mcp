#!/usr/bin/env node
/**
 * TheTabber MCP server.
 *
 * Exposes TheTabber's social-media publishing API to MCP-capable agents
 * (Claude Desktop, Claude Code, Cursor, …) as native tools. Every tool maps
 * 1:1 to a REST endpoint documented at https://thetabber.com/docs/api and uses
 * the same field names, so arguments the model produces pass straight through.
 *
 * Auth: set TABBER_API_KEY (from https://thetabber.com/dashboard/settings/api-keys).
 * Optional: TABBER_BASE_URL to point at a non-production instance.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { apiRequest, putToPresignedUrl, TabberApiError, config } from './client.js';

const server = new McpServer({
  name: 'thetabber',
  version: '0.1.0',
});

type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/** Wrap a tool handler so API errors come back as clean isError results. */
function handler<A>(fn: (args: A) => Promise<unknown>) {
  return async (args: A): Promise<ToolResult> => {
    try {
      const data = await fn(args);
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      if (err instanceof TabberApiError) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `TheTabber API error (${err.status}${err.code ? ` ${err.code}` : ''}): ${err.message}`,
            },
          ],
        };
      }
      return {
        isError: true,
        content: [{ type: 'text', text: `Unexpected error: ${(err as Error).message}` }],
      };
    }
  };
}

const MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

function guessMime(name: string, fallback?: string): string {
  return MIME_BY_EXT[extname(name).toLowerCase()] || fallback || 'application/octet-stream';
}

// ── Identity ────────────────────────────────────────────────────────────────
server.tool(
  'whoami',
  'Return the workspace and plan tied to the current API key. Use this first to confirm the key works.',
  {},
  handler(async () => apiRequest('/v1/me'))
);

// ── Social accounts ───────────────────────────────────────────────────────────
server.tool(
  'list_social_accounts',
  'List the social accounts connected to the workspace. Returns account UUIDs, platform, and handle. You need these UUIDs to create a post.',
  {},
  handler(async () => apiRequest('/v1/social-accounts'))
);

server.tool(
  'get_social_account',
  'Get a single connected social account by its UUID.',
  { id: z.string().describe('Social account UUID from list_social_accounts.') },
  handler(async ({ id }) => apiRequest(`/v1/social-accounts/${id}`))
);

// ── Posts ─────────────────────────────────────────────────────────────────────
server.tool(
  'list_posts',
  'List posts in the workspace, newest first. Optionally filter by status and paginate.',
  {
    status: z
      .array(z.enum(['scheduled', 'processing', 'posted', 'partial', 'failed', 'cancelled']))
      .optional()
      .describe('Only return posts in these statuses.'),
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  handler(async ({ status, offset, limit }) =>
    apiRequest('/v1/posts', { query: { status, offset, limit } })
  )
);

server.tool(
  'create_post',
  'Create a post and publish it now (omit scheduled_at) or schedule it for later. Publishes to every social_accounts UUID given. Attach media by UUID (from upload_media) or by public media_urls.',
  {
    social_accounts: z
      .array(z.string())
      .min(1)
      .describe('Social account UUIDs to post to. Get them from list_social_accounts.'),
    caption: z.string().optional().describe('Caption applied to all targeted platforms unless overridden per platform.'),
    media: z
      .array(z.string())
      .optional()
      .describe('Media UUIDs from upload_media / list_media. One video OR up to 10 images.'),
    media_urls: z
      .array(z.string())
      .optional()
      .describe('Public URLs you already host. Ignored if `media` is provided.'),
    scheduled_at: z
      .string()
      .optional()
      .describe('ISO 8601 future timestamp. Omit to publish immediately.'),
    timezone: z.string().optional().describe('IANA timezone for scheduled_at. Defaults to UTC.'),
    platform_configurations: z
      .record(z.any())
      .optional()
      .describe('Per-platform overrides / platform-specific options. See /docs/api.'),
  },
  handler(async (body) => apiRequest('/v1/posts', { method: 'POST', body }))
);

server.tool(
  'get_post',
  'Get a single post by UUID, including its current status.',
  { id: z.string().describe('Post UUID.') },
  handler(async ({ id }) => apiRequest(`/v1/posts/${id}`))
);

server.tool(
  'update_post',
  'Update a scheduled post (caption, targets, media, or schedule). Only works before it publishes.',
  {
    id: z.string().describe('Post UUID.'),
    caption: z.string().optional(),
    social_accounts: z.array(z.string()).optional(),
    media: z.array(z.string()).optional(),
    media_urls: z.array(z.string()).optional(),
    scheduled_at: z.string().optional().describe('New future timestamp. Cannot be null on update.'),
    timezone: z.string().optional(),
    platform_configurations: z.record(z.any()).optional(),
  },
  handler(async ({ id, ...body }) => apiRequest(`/v1/posts/${id}`, { method: 'PATCH', body }))
);

server.tool(
  'cancel_post',
  'Cancel/delete a post by UUID. Cancels a scheduled post before it publishes.',
  { id: z.string().describe('Post UUID.') },
  handler(async ({ id }) => apiRequest(`/v1/posts/${id}`, { method: 'DELETE' }))
);

// ── Media ─────────────────────────────────────────────────────────────────────
server.tool(
  'upload_media',
  'Upload a media file so it can be attached to a post. Provide either a local file_path or a public source_url; returns a media UUID to pass to create_post.',
  {
    file_path: z.string().optional().describe('Absolute path to a local file to upload.'),
    source_url: z.string().optional().describe('Public URL to fetch and upload instead of a local file.'),
    name: z.string().optional().describe('Override the stored filename (defaults to the source name).'),
    mime_type: z.string().optional().describe('Override the detected MIME type.'),
  },
  handler(async ({ file_path, source_url, name, mime_type }) => {
    if (!file_path && !source_url) {
      throw new TabberApiError(400, 'Provide either file_path or source_url.', 'validation_error');
    }

    let bytes: Uint8Array;
    let resolvedName: string;
    let resolvedMime: string;

    if (file_path) {
      const buf = await readFile(file_path);
      bytes = new Uint8Array(buf);
      resolvedName = name || basename(file_path);
      resolvedMime = mime_type || guessMime(resolvedName);
    } else {
      const res = await fetch(source_url!);
      if (!res.ok) {
        throw new TabberApiError(res.status, `Failed to fetch source_url (status ${res.status}).`, 'fetch_failed');
      }
      const ab = await res.arrayBuffer();
      bytes = new Uint8Array(ab);
      resolvedName = name || basename(new URL(source_url!).pathname) || 'upload';
      resolvedMime = mime_type || res.headers.get('content-type') || guessMime(resolvedName);
    }

    // Step 1: ask the API for a presigned upload target.
    const created = await apiRequest<{
      id?: string;
      media_id?: string;
      upload_url?: string;
      url?: string;
    }>('/v1/media/create-upload-url', {
      method: 'POST',
      body: { name: resolvedName, mime_type: resolvedMime, size_bytes: bytes.byteLength },
    });

    const uploadUrl = created.upload_url || created.url;
    const mediaId = created.media_id || created.id;
    if (!uploadUrl) {
      throw new TabberApiError(502, 'create-upload-url did not return an upload URL.', 'no_upload_url', created);
    }

    // Step 2: PUT the bytes to the presigned URL.
    await putToPresignedUrl(uploadUrl, bytes, resolvedMime);

    return {
      media_id: mediaId,
      name: resolvedName,
      mime_type: resolvedMime,
      size_bytes: bytes.byteLength,
      note: 'Pass media_id in the `media` array of create_post.',
    };
  })
);

server.tool(
  'list_media',
  'List uploaded media assets in the workspace.',
  {
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  handler(async ({ offset, limit }) => apiRequest('/v1/media', { query: { offset, limit } }))
);

server.tool(
  'get_media',
  'Get a single media asset by UUID.',
  { id: z.string().describe('Media UUID.') },
  handler(async ({ id }) => apiRequest(`/v1/media/${id}`))
);

server.tool(
  'delete_media',
  'Delete a media asset by UUID.',
  { id: z.string().describe('Media UUID.') },
  handler(async ({ id }) => apiRequest(`/v1/media/${id}`, { method: 'DELETE' }))
);

// ── Post results (per-account outcomes) ────────────────────────────────────────
server.tool(
  'list_post_results',
  'List per-account publish results — whether each account posted, failed, and why. Use this to confirm a post actually went out.',
  {
    offset: z.number().int().min(0).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  handler(async ({ offset, limit }) => apiRequest('/v1/post-results', { query: { offset, limit } }))
);

server.tool(
  'get_post_result',
  'Get a single per-account post result by UUID.',
  { id: z.string().describe('Post result UUID.') },
  handler(async ({ id }) => apiRequest(`/v1/post-results/${id}`))
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we never corrupt the stdio JSON-RPC stream on stdout.
  console.error(
    `TheTabber MCP server running (base: ${config.baseUrl}, api key ${config.hasKey ? 'set' : 'MISSING'}).`
  );
}

main().catch((err) => {
  console.error('Fatal error starting TheTabber MCP server:', err);
  process.exit(1);
});
