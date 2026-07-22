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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    useAuthStore.getState().clearToken();
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json();
  if (!res.ok) throw new ApiError(body as ErrorEnvelope, res.status);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data instanceof FormData ? data : JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
