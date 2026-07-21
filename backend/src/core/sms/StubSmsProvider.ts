import type { SmsProvider } from "./SmsProvider";

/**
 * Placeholder — see docs/decisions.md #2. Eskiz.uz is the candidate provider
 * but its API hasn't been verified against a real account yet, so this logs
 * instead of sending a real SMS. Swap for a real implementation once an
 * Eskiz.uz (or alternative) account and credentials exist — the interface
 * (SmsProvider) is what the rest of the app depends on, so that swap doesn't
 * touch orderService/riskService/routes.
 */
export class StubSmsProvider implements SmsProvider {
  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    console.log(`[StubSmsProvider] Would send OTP ${code} to ${phoneNumber} (no real SMS provider configured yet)`);
  }
}
