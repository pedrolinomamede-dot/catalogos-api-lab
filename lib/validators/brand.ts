import { z } from "zod";

import { normalizeCnpj } from "@/lib/utils/cnpj";

const optionalCnpjSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  return normalizeCnpj(value);
}, z.string().length(14, "CNPJ must have 14 digits").nullable().optional());

export const brandCreateSchema = z.object({
  name: z.string().min(3).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/i),
  logoUrl: z.string().url().nullable().optional(),
  cnpj: optionalCnpjSchema,
  isActive: z.boolean().optional(),
});

export const brandUpdateSchema = brandCreateSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
