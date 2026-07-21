import type { Request, Response } from "express";
import { userService } from "../services/userService";
import { phoneVerifySchema } from "../dto/user.dto";
import { ForbiddenError, ValidationError } from "../errors/AppError";

export const userController = {
  async verifyPhone(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Can only verify your own phone number");
    }

    const parsed = phoneVerifySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid phone verification payload", { issues: parsed.error.issues });

    const isPhoneVerified = await userService.verifyPhone(telegramId, parsed.data.phoneNumber);
    res.json({ isPhoneVerified });
  },
};
