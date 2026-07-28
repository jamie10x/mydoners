import type { Request, Response } from "express";
import { userService, mapPublicUser } from "../services/userService";
import { locationRequestService } from "../services/locationRequestService";
import { savedAddressService } from "../services/savedAddressService";
import { userRepository } from "../repositories/userRepository";
import {
  phoneVerifySchema,
  locationSubmitSchema,
  savedAddressSchema,
  profileUpdateSchema,
} from "../dto/user.dto";
import { ForbiddenError, ValidationError, NotFoundError } from "../errors/AppError";

function assertSelfOrBot(req: Request, telegramId: number) {
  if (req.actor?.type === "bot") return;
  if (req.actor?.type === "user" && req.actor.telegramId === telegramId) return;
  throw new ForbiddenError("Faqat o'z hisobingiz uchun amal bajarishingiz mumkin");
}

export const userController = {
  async verifyPhone(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Faqat o'z telefon raqamingizni tasdiqlashingiz mumkin");
    }

    const parsed = phoneVerifySchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Telefon tasdiqlash ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    const isPhoneVerified = await userService.verifyPhone(telegramId, parsed.data.phoneNumber);
    res.json({ isPhoneVerified });
  },

  // Read by both the Mini App (to show its own profile) and the customer
  // bot (to decide whether onboarding is still needed).
  async getProfile(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    assertSelfOrBot(req, telegramId);

    const user = await userRepository.findByTelegramId(telegramId);
    if (!user) throw new NotFoundError(`Foydalanuvchi ${telegramId} topilmadi`);
    res.json({ user: await mapPublicUser(user) });
  },

  // Bot-driven onboarding (first name / last name / phone) — see customer-bot.
  async updateProfile(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    assertSelfOrBot(req, telegramId);

    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Profil ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    const user = await userService.updateProfile(telegramId, parsed.data);
    res.json({ user });
  },

  // Checkout fallback when browser geolocation is denied/unavailable — asks
  // the customer to share via the customer bot's native location button.
  async requestLocation(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Faqat o'z joylashuvingizni so'rashingiz mumkin");
    }

    await locationRequestService.requestLocation(telegramId);
    res.status(202).json({ requested: true });
  },

  // The Mini App polls this after calling requestLocation, waiting for the
  // customer bot to forward a shared location (see submitLocation below).
  async getLocation(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Faqat o'z joylashuvingizni ko'rishingiz mumkin");
    }

    const location = await locationRequestService.getLocation(telegramId);
    res.json({ location });
  },

  // Called by the customer bot (shared-secret auth) once the user taps
  // Telegram's native "Share my location" reply-keyboard button.
  async submitLocation(req: Request, res: Response) {
    if (req.actor?.type !== "bot") {
      throw new ForbiddenError("Faqat mijozlar boti foydalanuvchi nomidan joylashuv yuborishi mumkin");
    }

    const telegramId = Number(req.params.telegramId);
    const parsed = locationSubmitSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Joylashuv ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    await locationRequestService.submitLocation(telegramId, parsed.data.latitude, parsed.data.longitude);
    res.status(204).send();
  },

  // Saved delivery addresses — up to 3, freely labeled (Home/Work/custom).
  async listAddresses(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    assertSelfOrBot(req, telegramId);
    res.json(await savedAddressService.list(telegramId));
  },

  async createAddress(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    assertSelfOrBot(req, telegramId);

    const parsed = savedAddressSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Manzil ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    const address = await savedAddressService.create(
      telegramId,
      parsed.data.label,
      parsed.data.latitude,
      parsed.data.longitude,
      parsed.data.landmarkAddress,
    );
    res.status(201).json(address);
  },

  async updateAddress(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Faqat o'z saqlangan manzilingizni tahrirlashingiz mumkin");
    }

    const parsed = savedAddressSchema.partial().safeParse(req.body);
    if (!parsed.success) throw new ValidationError("Manzil ma'lumotlari noto'g'ri", { issues: parsed.error.issues });

    const address = await savedAddressService.update(telegramId, Number(req.params.addressId), parsed.data);
    res.json(address);
  },

  async deleteAddress(req: Request, res: Response) {
    const telegramId = Number(req.params.telegramId);
    if (req.actor?.type !== "user" || req.actor.telegramId !== telegramId) {
      throw new ForbiddenError("Faqat o'z saqlangan manzilingizni o'chirishingiz mumkin");
    }

    await savedAddressService.delete(telegramId, Number(req.params.addressId));
    res.status(204).send();
  },
};
