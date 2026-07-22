import { userRepository } from "../repositories/userRepository";
import { savedAddressRepository } from "../repositories/savedAddressRepository";
import type { PublicUser } from "@mydoners/shared-contracts";

type UserRow = Awaited<ReturnType<typeof userRepository.findByTelegramId>>;

export async function mapPublicUser(user: NonNullable<UserRow>): Promise<PublicUser> {
  const addressCount = await savedAddressRepository.countByUser(user.telegramId);
  const hasName = Boolean(user.firstName && user.lastName);
  const hasPhone = Boolean(user.phoneNumber);

  return {
    telegramId: user.telegramId,
    firstName: user.firstName ?? "",
    lastName: user.lastName,
    username: user.username,
    phoneNumber: user.phoneNumber,
    isPhoneVerified: user.isPhoneVerified ?? false,
    completedOrdersCount: user.completedOrdersCount ?? 0,
    isBlacklisted: user.isBlacklisted ?? false,
    isProfileComplete: hasName && hasPhone && addressCount > 0,
  };
}

export const userService = {
  /**
   * Marks a user's phone as verified from Telegram's native contact-request
   * widget (never a manually-typed number — see docs/openapi.yaml).
   *
   * Trust boundary, stated plainly: this does NOT cryptographically verify
   * `telegramContactPayload` against Telegram's servers. Doing that properly
   * requires the customer bot's webhook to receive the `contact` message
   * Telegram sends when the widget completes (the Mini App itself never
   * receives a signed payload for this the way initData is signed) —
   * customer-bot doesn't implement that handler yet (only /start, /help, and
   * location messages). Until it does, this trusts the caller's
   * authenticated session (a valid Mini App JWT) as the boundary: only the
   * logged-in user can mark their own phone verified, and the raw payload is
   * stored for audit but not deeply parsed. Documented here rather than
   * pretending a verification step happens that doesn't.
   */
  async verifyPhone(telegramId: number, phoneNumber: string): Promise<boolean> {
    await userRepository.setPhoneVerified(telegramId, phoneNumber);
    return true;
  },

  /**
   * Used by the customer bot's onboarding conversation (name/last name text
   * replies, phone via its own request_contact widget — a first-party
   * Telegram signal at least as trustworthy as the Mini App's phone-verify
   * flow above, so it also marks isPhoneVerified when a phone is included).
   */
  async updateProfile(
    telegramId: number,
    patch: { firstName?: string; lastName?: string; phoneNumber?: string },
  ): Promise<PublicUser> {
    await userRepository.updateProfile(telegramId, patch);
    const user = await userRepository.findByTelegramId(telegramId);
    if (!user) throw new Error(`User ${telegramId} not found after updating profile`);
    return await mapPublicUser(user);
  },
};
