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
        // Prefer the string telegram-web-app.js injects directly — it's
        // Telegram's own untouched value, guaranteed byte-identical to what
        // their servers signed. @telegram-apps/sdk's retrieveLaunchParams()
        // re-parses and reconstructs the query string, which has been
        // observed to alter the "user" field's byte content (e.g. via a
        // decode/re-encode round trip) and break HMAC signature validation
        // on real Telegram Desktop clients even though the same code path
        // works for locally-mocked dev data. Fall back to the SDK for local
        // dev, where mockTelegramEnv patches the SDK but not window.Telegram.
        const nativeInitData = window.Telegram?.WebApp?.initData;
        const initDataRaw = nativeInitData || retrieveLaunchParams().initDataRaw;
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
