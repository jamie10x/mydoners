// Shift-scoped, deliberately separate from pendingDeliveries.ts (which is
// order-scoped): a live-location share belongs to the courier's shift, not to
// any single order. In-memory is fine — worst case after a restart the bot
// re-prompts once, and Telegram keeps streaming position updates regardless.

const PROMPT_COOLDOWN_MS = 60 * 60 * 1000;
// Telegram sends position updates every few seconds while moving. One POST per
// 10s is plenty for a map and keeps load off the backend's fan-out.
const REPORT_THROTTLE_MS = 10_000;

let liveUntil = 0;
let lastPromptAt = 0;
let lastReportAt = 0;

export const liveLocationState = {
  /** Called when the courier starts a live share, with Telegram's live_period. */
  start(livePeriodSeconds: number): void {
    liveUntil = Date.now() + livePeriodSeconds * 1000;
  },

  isActive(): boolean {
    return Date.now() < liveUntil;
  },

  /** True at most once an hour, and only while no live share is running. */
  shouldPrompt(): boolean {
    return !this.isActive() && Date.now() - lastPromptAt > PROMPT_COOLDOWN_MS;
  },

  markPrompted(): void {
    lastPromptAt = Date.now();
  },

  /** Rate limit for outbound position reports. */
  shouldReport(): boolean {
    if (Date.now() - lastReportAt < REPORT_THROTTLE_MS) return false;
    lastReportAt = Date.now();
    return true;
  },

  stop(): void {
    liveUntil = 0;
  },
};
