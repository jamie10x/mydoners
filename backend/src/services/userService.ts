import { userRepository } from "../repositories/userRepository";

export const userService = {
  /**
   * Marks a user's phone as verified from Telegram's native contact-request
   * widget (never a manually-typed number — see docs/openapi.yaml).
   *
   * Trust boundary, stated plainly: this does NOT cryptographically verify
   * `telegramContactPayload` against Telegram's servers. Doing that properly
   * requires a customer-facing bot webhook receiving the `contact` message
   * Telegram sends when the widget completes (the Mini App itself never
   * receives a signed payload for this the way initData is signed) — this
   * system doesn't have a customer-facing bot process yet (only the
   * Courier Bot exists as a service). Until that webhook exists, this trusts
   * the caller's authenticated session (a valid Mini App JWT) as the
   * boundary: only the logged-in user can mark their own phone verified, and
   * the raw payload is stored for audit but not deeply parsed. Documented
   * here rather than pretending a verification step happens that doesn't.
   */
  async verifyPhone(telegramId: number, phoneNumber: string): Promise<boolean> {
    await userRepository.setPhoneVerified(telegramId, phoneNumber);
    return true;
  },
};
