import { z } from "zod";

const colorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Color must be a hex value")
  .optional();

export const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1).optional(),
  color: colorSchema,
  sortOrder: z.number().int().optional(),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).optional(),
    icon: z.string().min(1).optional(),
    color: colorSchema,
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
