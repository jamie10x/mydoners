import { z } from "zod";

// Mirrors the phone-verify request body in docs/openapi.yaml.
export const phoneVerifySchema = z.object({
  phoneNumber: z.string().min(5),
  telegramContactPayload: z.string().min(1),
});

export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;

// Customer bot forwards a Telegram location message here after the user taps
// the native "Share my location" reply-keyboard button.
export const locationSubmitSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type LocationSubmitInput = z.infer<typeof locationSubmitSchema>;

// Saved delivery addresses — up to 3 per user, freely labeled (Home, Work,
// or anything else), enforced in savedAddressService, not here.
export const savedAddressSchema = z.object({
  label: z.string().min(1).max(50),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  landmarkAddress: z.string().min(1),
});

export type SavedAddressInput = z.infer<typeof savedAddressSchema>;

// Bot-driven onboarding sets these — at least one field, never an empty patch.
export const profileUpdateSchema = z
  .object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phoneNumber: z.string().min(5).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Whatever Telegram hands the bot in ctx.from on /start — all optional, since
// a user may have no surname and no public username.
export const botContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  username: z.string().optional(),
});
