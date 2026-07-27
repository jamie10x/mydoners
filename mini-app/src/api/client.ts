import { useAuthStore } from "../store/authStore";
import type { ErrorEnvelope } from "@mydoners/shared-contracts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// On a bad mobile connection a request can otherwise hang forever with no
// user escape — 12s is long enough for a slow 3G round trip, short enough
// that the retry (GETs) or the error UI kicks in while the user still cares.
const REQUEST_TIMEOUT_MS = 12_000;
const GET_RETRY_DELAY_MS = 500;

export class ApiError extends Error {
  constructor(
    public readonly envelope: ErrorEnvelope,
    public readonly status: number,
  ) {
    super(envelope.message);
  }
}

/** Connection-level failure (offline, DNS, timeout) — the server never answered. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Network request failed");
    this.cause = cause;
  }
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError;
}

async function fetchOnce<T>(path: string, init: RequestInit, auth: boolean): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // fetch rejects only on connection-level problems (offline, DNS, abort) —
    // HTTP error statuses resolve normally and are handled below.
    throw new NetworkError(err);
  }

  // 204 (e.g. DELETE) has no body — calling res.json() on it throws.
  if (res.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body — e.g. an HTML 502 page from nginx, or a truncated
    // response. Surface it as a server error, not a raw SyntaxError.
    throw new ApiError(
      { code: "SERVER_ERROR", message: "The server returned an unexpected response." },
      res.status,
    );
  }

  if (!res.ok) throw new ApiError(body as ErrorEnvelope, res.status);
  return body as T;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const isGet = (init.method ?? "GET") === "GET";
  try {
    return await fetchOnce<T>(path, init, auth);
  } catch (err) {
    // One retry, GETs only — safe to repeat, and a single short backoff
    // covers the common blip (cell handoff, brief wifi drop). Mutations are
    // never auto-retried until they carry idempotency keys.
    if (isGet && isNetworkError(err)) {
      await new Promise((r) => setTimeout(r, GET_RETRY_DELAY_MS));
      return fetchOnce<T>(path, init, auth);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }, auth),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
