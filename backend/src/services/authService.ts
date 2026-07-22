import { signSessionToken, verifyTelegramInitData } from "../middleware/auth";
import { userRepository } from "../repositories/userRepository";
import { mapPublicUser } from "./userService";
import { env } from "../config/env";

export const authService = {
  async loginWithTelegram(initData: string) {
    const profile = verifyTelegramInitData(initData, env.telegramBotToken);
    const user = await userRepository.upsertFromTelegram(profile);
    const token = signSessionToken(user.telegramId);

    return { token, user: mapPublicUser(user) };
  },
};
