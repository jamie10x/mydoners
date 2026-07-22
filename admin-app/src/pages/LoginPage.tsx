import { useState } from "react";
import { api, ApiError } from "../api/client";
import { useAuthStore } from "../store/authStore";

export function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await api.post<{ token: string }>("/admin/login", { password });
      setToken(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.envelope.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">MyDoners Admin</h1>
        <p className="mb-6 text-sm text-black/50">Menu management</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="mb-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
