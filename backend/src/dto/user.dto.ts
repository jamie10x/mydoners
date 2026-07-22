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

// Saves the checkout's current coordinates as a reusable "Home" shortcut.
export const homeAddressSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  landmarkAddress: z.string().min(1),
});

export type HomeAddressInput = z.infer<typeof homeAddressSchema>;
