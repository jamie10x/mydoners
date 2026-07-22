import { z } from "zod";

export const adminLoginSchema = z.object({
  password: z.string().min(1),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1),
  displayOrder: z.number().int().default(0),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

const productBaseSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  hasMeatChoice: z.boolean().default(false),
  basePrice: z.number().nonnegative().optional(),
  beefPrice: z.number().nonnegative().optional(),
  chickenPrice: z.number().nonnegative().optional(),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().nullable().optional(),
});

// A meat-choice product needs beef/chicken prices; a plain one needs basePrice.
// Enforced here rather than left to the DB, since which fields are required
// depends on hasMeatChoice.
export const productCreateSchema = productBaseSchema.refine(
  (data) => (data.hasMeatChoice ? data.beefPrice !== undefined && data.chickenPrice !== undefined : data.basePrice !== undefined),
  { message: "hasMeatChoice products need beefPrice+chickenPrice; others need basePrice" },
);

export const productUpdateSchema = productBaseSchema.partial();
