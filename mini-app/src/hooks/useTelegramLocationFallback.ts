import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

type Coords = { latitude: number; longitude: number };
type Status = "idle" | "requesting" | "waiting" | "received" | "error";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * Fallback for when the Mini App's own browser geolocation prompt is denied
 * or unavailable: asks the customer bot to request a location via Telegram's
 * native "share location" button (see backend's locationRequestService),
 * then polls for it to arrive.
 */
export function useTelegramLocationFallback(telegramId: number | undefined) {
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const pollHandle = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutHandle = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopPolling() {
    if (pollHandle.current) clearInterval(pollHandle.current);
    if (timeoutHandle.current) clearTimeout(timeoutHandle.current);
    pollHandle.current = null;
    timeoutHandle.current = null;
  }

  async function checkOnce(): Promise<Coords | null> {
    if (!telegramId) return null;
    try {
      const res = await api.get<{ location: Coords | null }>(`/users/${telegramId}/location`);
      return res.location;
    } catch {
      return null;
    }
  }

  function beginPolling() {
    pollHandle.current = setInterval(async () => {
      const location = await checkOnce();
      if (location) {
        setCoords(location);
        setStatus("received");
        stopPolling();
      }
    }, POLL_INTERVAL_MS);

    timeoutHandle.current = setTimeout(() => {
      stopPolling();
      setStatus((current) => (current === "waiting" ? "error" : current));
    }, POLL_TIMEOUT_MS);
  }

  // Fresh ask: sends the Telegram message with the "share location" button.
  async function start() {
    if (!telegramId) return;
    setStatus("requesting");
    try {
      await api.post(`/users/${telegramId}/location-request`, undefined);
      setStatus("waiting");
    } catch {
      setStatus("error");
      return;
    }
    beginPolling();
  }

  // Reopen-resume: the app may have been closed after a message was already
  // sent (see checkoutStore's awaitingTelegramLocation) — check once for a
  // location that arrived while the app was closed before resuming polling,
  // without spamming another "please share" message.
  async function resume() {
    if (!telegramId) return;
    setStatus("waiting");
    const location = await checkOnce();
    if (location) {
      setCoords(location);
      setStatus("received");
      return;
    }
    beginPolling();
  }

  useEffect(() => stopPolling, []);

  return { status, coords, start, resume };
}
