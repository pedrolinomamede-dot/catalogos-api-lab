import { z } from "zod";

const skuSchema = z
  .string()
  .regex(/^\d{4}$/, "SKU must have exactly 4 digits");

const nameSchema = z
  .string()
  .min(2)
  .refine((value) => !value.trim().startsWith("#"), {
    message: "Product name starting with # is ignored",
  });

export const variationCreateSchema = z.object({
  variantType: z.string().min(1).optional(),
  variantValue: z.string().min(1).optional(),
  price: z.number().min(0),
  stockQuantity: z.number().int().min(0).optional(),
  barcode: z.string().min(1).optional(),
});

export const variationUpdateSchema = z
  .object({
    variantType: z.string().min(1).optional(),
    variantValue: z.string().min(1).optional(),
    price: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    barcode: z.string().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const imageCreateSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  altText: z.string().min(1).max(255).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const imageReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const productCreateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  sku: skuSchema,
  name: nameSchema,
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  variations: z.array(variationCreateSchema).optional(),
});

export const productUpdateSchema = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    sku: skuSchema.optional(),
    name: nameSchema.optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
