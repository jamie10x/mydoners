import type { Request, Response } from "express";
import { userService } from "../services/userService";
import { locationRequestService } from "../services/locationRequestService";
import { phoneVerifySchema, locationSubmitSchema, homeAddressSchema } from "../dto/user.dto";
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

  // Checkout fallback when browser geolocation is denied/unavailable — asks
  // the customer to share via the customer bot's native location button.
  async requestLocation(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Can only request your own location");
    }

    await locationRequestService.requestLocation(telegramId);
    res.status(202).json({ requested: true });
  },

  // The Mini App polls this after calling requestLocation, waiting for the
  // customer bot to forward a shared location (see submitLocation below).
  async getLocation(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Can only read your own location");
    }

    const location = await locationRequestService.getLocation(telegramId);
    res.json({ location });
  },

  // Called by the customer bot (shared-secret auth) once the user taps
  // Telegram's native "Share my location" reply-keyboard button.
  async submitLocation(req: Request, res: Response) {
    if (req.actor?.type !== "bot") {
      throw new ForbiddenError("Only the customer bot can submit a location on a user's behalf");
    }

    const telegramId = Number(req.params.telegramId);
    const parsed = locationSubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid location payload", { issues: parsed.error.issues });

    await locationRequestService.submitLocation(telegramId, parsed.data.latitude, parsed.data.longitude);
    res.status(204).send();
  },

  // Saves the checkout's current coordinates as the reusable "Home" shortcut
  // — most orders happen from home, so this skips re-sharing location later.
  async saveHomeAddress(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Can only save your own home address");
    }

    const parsed = homeAddressSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Invalid home address payload", { issues: parsed.error.issues });

    const user = await userService.saveHomeAddress(
      telegramId,
      parsed.data.latitude,
      parsed.data.longitude,
      parsed.data.landmarkAddress,
    );
    res.json({ user });
  },
};
