import { z } from "zod";

// Mirrors CreateOrderRequest in docs/openapi.yaml
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        selectedVariant: z.string().nullable().optional(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  paymentType: z.enum(["CASH", "CLICK", "PAYME"]),
  latitude: z.number(),
  longitude: z.number(),
  landmarkAddress: z.string().min(1),
  courierNotes: z.string().nullable().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COOKING", "READY_FOR_DELIVERY", "ON_THE_WAY", "DELIVERED", "CANCELLED"]),
  changedBy: z.enum(["KITCHEN", "COURIER", "USER", "SYSTEM"]),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
