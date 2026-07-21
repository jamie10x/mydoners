import { randomInt } from "node:crypto";
import { redis } from "../core/redis";
import { StubSmsProvider } from "../core/sms/StubSmsProvider";
import type { SmsProvider } from "../core/sms/SmsProvider";
import { orderRepository } from "../repositories/orderRepository";
import { userRepository } from "../repositories/userRepository";
import { NotFoundError, ValidationError } from "../errors/AppError";

const OTP_TTL_SECONDS = 5 * 60;
const smsProvider: SmsProvider = new StubSmsProvider();

function otpKey(orderId: number): string {
  return `otp:order:${orderId}`;
}

export const otpService = {
  async requestOtp(orderId: number): Promise<void> {
    const result = await orderRepository.findById(orderId);
    if (!result) throw new NotFoundError(`Order ${orderId} not found`);

    const user = await userRepository.findByTelegramId(result.order.userId!);
    if (!user?.phoneNumber) {
      throw new ValidationError("No verified phone number on file for this order's customer", { orderId });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await redis.set(otpKey(orderId), code, { EX: OTP_TTL_SECONDS });
    await smsProvider.sendOtp(user.phoneNumber, code);
  },

  async verifyOtp(orderId: number, submittedCode: string): Promise<boolean> {
    const storedCode = await redis.get(otpKey(orderId));
    if (!storedCode || storedCode !== submittedCode) return false;
    await redis.del(otpKey(orderId));
    return true;
  },
};
