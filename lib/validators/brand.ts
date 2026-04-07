import { z } from "zod";

export const brandCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/i),
  logoUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const brandUpdateSchema = brandCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
