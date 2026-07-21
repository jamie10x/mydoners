import { useEffect, useState } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { PublicUser } from "@mydoners/shared-contracts";

interface TelegramLoginResponse {
  token: string;
  user: PublicUser;
}

type AuthStatus = "loading" | "ready" | "error";

export function useTelegramAuth(): { status: AuthStatus; error: string | null } {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    let cancelled = false;

    async function login() {
      try {
        const { initDataRaw } = retrieveLaunchParams();
        if (!initDataRaw) {
          throw new Error("No Telegram launch data — open this app from inside Telegram.");
        }
        const result = await api.post<TelegramLoginResponse>("/auth/telegram", { initData: initDataRaw }, false);
        if (cancelled) return;
        setSession(result.token, result.user);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to authenticate");
        setStatus("error");
      }
    }

    login();
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  return { status, error };
}
