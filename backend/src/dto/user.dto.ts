import { z } from "zod";

// Mirrors the phone-verify request body in docs/openapi.yaml.
export const phoneVerifySchema = z.object({
  phoneNumber: z.string().min(5),
  telegramContactPayload: z.string().min(1),
});

export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;
