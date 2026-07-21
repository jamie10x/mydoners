import { useState } from "react";
import { requestContact } from "@telegram-apps/sdk";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";

type Status = "idle" | "requesting" | "error";

/**
 * Wraps Telegram's native contact-request widget (requestContact(), Mini
 * Apps v6.9+) — never accepts a manually-typed phone number, per the
 * blueprint. The returned contact carries a `hash` Telegram signs, but the
 * exact data-check-string format for this specific method isn't documented
 * clearly enough to re-verify server-side with confidence (unlike initData's
 * well-documented algorithm) — see backend/src/services/userService.ts for
 * the stated trust boundary this relies on instead.
 */
export function usePhoneVerification() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  async function verify() {
    if (!user) return;
    setStatus("requesting");
    setError(null);
    try {
      const contact = await requestContact();
      if (contact.contact.userId !== user.telegramId) {
        throw new Error("Shared contact doesn't match your account");
      }
      await api.post(`/users/${user.telegramId}/phone-verify`, {
        phoneNumber: contact.contact.phoneNumber,
        telegramContactPayload: JSON.stringify({
          userId: contact.contact.userId,
          authDate: contact.authDate,
          hash: contact.hash,
        }),
      });
      updateUser({ isPhoneVerified: true });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't verify your phone number");
      setStatus("error");
    }
  }

  return { verify, status, error };
}
