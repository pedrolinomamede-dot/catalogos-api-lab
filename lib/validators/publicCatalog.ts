import { z } from "zod";

const toTrimmedString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const toOptionalInt = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? value : parsed;
};

export const brandSlugSchema = z
  .preprocess(toTrimmedString, z.string().min(1))
  .transform((value) => value.toLowerCase());

export const publicBrandQuerySchema = z.object({
  brandSlug: brandSlugSchema,
});

export const publicProductsQuerySchema = z.object({
  brandSlug: brandSlugSchema,
  q: z.preprocess(toTrimmedString, z.string().min(1).optional()),
  categoryId: z.preprocess(toTrimmedString, z.string().min(1).optional()),
  page: z.preprocess(toOptionalInt, z.number().int().min(1).optional()),
  pageSize: z.preprocess(
    toOptionalInt,
    z.number().int().min(1).max(50).optional(),
  ),
});
