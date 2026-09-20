/**
 * Thin HTTP client for the TheTabber public API.
 *
 * Auth: every request carries `Authorization: Bearer <TABBER_API_KEY>`.
 * The key is read once at startup; if it is missing we fail closed so the
 * agent gets a clear error instead of silently making unauthenticated calls.
 */

const BASE_URL = (process.env.TABBER_BASE_URL || 'https://thetabber.com').replace(/\/$/, '');
const API_KEY = process.env.TABBER_API_KEY;

export class TabberApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'TabberApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function requireKey(): string {
  if (!API_KEY) {
    throw new TabberApiError(
      401,
      'TABBER_API_KEY is not set. Create a key at https://thetabber.com/dashboard/settings/api-keys and pass it to this server via the TABBER_API_KEY environment variable.',
      'missing_api_key'
    );
  }
  return API_KEY;
}

type Query = Record<string, string | number | boolean | undefined | (string | number)[]>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

interface RequestOptions {
  method?: string;
  query?: Query;
  body?: unknown;
}

/**
 * Perform an authenticated JSON request against the TheTabber API and return
 * the parsed response. Non-2xx responses are turned into TabberApiError with
 * the API's error code/message when available.
 */
export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const key = requireKey();
  const { method = 'GET', query, body } = options;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errObj =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? (parsed as { error?: { code?: string; message?: string } }).error
        : undefined;
    throw new TabberApiError(
      res.status,
      errObj?.message || `Request to ${path} failed with status ${res.status}`,
      errObj?.code,
      parsed
    );
  }

  return parsed as T;
}

/**
 * Upload raw bytes to a presigned URL returned by /v1/media/create-upload-url.
 * The presigned target is on object storage, not the API, so no bearer token.
 */
export async function putToPresignedUrl(
  uploadUrl: string,
  bytes: Uint8Array | ArrayBuffer,
  contentType: string
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: bytes,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new TabberApiError(res.status, `Failed to upload media bytes (status ${res.status}). ${detail}`.trim(), 'upload_failed');
  }
}

export const config = { baseUrl: BASE_URL, hasKey: Boolean(API_KEY) };
