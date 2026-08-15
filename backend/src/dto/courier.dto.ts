import { z } from "zod";

export const courierLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  // false when the courier dropped a one-shot pin instead of starting a live
  // share — still worth relaying, but it must not drive an ETA.
  isLive: z.boolean().default(true),
});
