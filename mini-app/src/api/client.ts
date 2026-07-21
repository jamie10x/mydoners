import { useAuthStore } from "../store/authStore";
import type { ErrorEnvelope } from "@mydoners/shared-contracts";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export class ApiError extends Error {
  constructor(
    public readonly envelope: ErrorEnvelope,
    public readonly status: number,
  ) {
    super(envelope.message);
  }
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string>) };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = await res.json();

  if (!res.ok) throw new ApiError(body as ErrorEnvelope, res.status);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }, auth),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
};
