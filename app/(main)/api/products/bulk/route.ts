import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { variationCreateSchema } from "@/lib/validators/product";

const bulkProductSchema = z.object({
  categoryId: z.string().uuid().optional(),
  sku: z.string().regex(/^\d{4}$/),
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  variations: z.array(variationCreateSchema).optional(),
});

const bulkPayloadSchema = z.array(bulkProductSchema).min(1);

export async function POST(request: Request) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const items = Array.isArray(body)
    ? body
    : (body as { items?: unknown }).items;

  const parsed = bulkPayloadSchema.safeParse(items);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const skipped: Array<{ index: number; name: string; reason: string }> = [];
  const validItems = parsed.data
    .map((item) => ({
      ...item,
      sku: item.sku.trim(),
      name: item.name.trim(),
    }))
    .filter((item, index) => {
      if (item.name.startsWith("#")) {
        skipped.push({
          index,
          name: item.name,
          reason: "Product name starts with #",
        });
        return false;
      }
      return true;
    });

  const seenSkus = new Set<string>();
  const duplicateSkus = new Set<string>();
  for (const item of validItems) {
    if (seenSkus.has(item.sku)) {
      duplicateSkus.add(item.sku);
    }
    seenSkus.add(item.sku);
  }
  if (duplicateSkus.size > 0) {
    return jsonError(400, "duplicate_skus", "Duplicate SKUs in payload", {
      skus: Array.from(duplicateSkus),
    });
  }

  const categoryIds = Array.from(
    new Set(validItems.map((item) => item.categoryId).filter(Boolean)),
  ) as string[];

  try {
    return await withBrand(auth.brandId, async (tx) => {
      if (categoryIds.length > 0) {
        const categories = await tx.category.findMany({
          where: {
            id: { in: categoryIds },
            brandId: auth.brandId,
          },
          select: { id: true },
        });
        if (categories.length !== categoryIds.length) {
          return jsonError(400, "invalid_category", "Category not found");
        }
      }

      for (const item of validItems) {
        await tx.product.create({
          data: {
            brandId: auth.brandId,
            categoryId: item.categoryId ?? null,
            sku: item.sku,
            name: item.name,
            description: item.description,
            isActive: item.isActive ?? true,
            variations: item.variations?.length
              ? {
                  create: item.variations.map((variation) => ({
                    brandId: auth.brandId,
                    variantType: variation.variantType,
                    variantValue: variation.variantValue,
                    price: variation.price,
                    stockQuantity: variation.stockQuantity,
                    barcode: variation.barcode,
                  })),
                }
              : undefined,
          },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          data: {
            created: validItems.length,
            skipped: skipped.length,
            skippedItems: skipped,
            errors: [],
          },
        },
        { status: 201 },
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "product_conflict", "Product SKU already exists");
    }
    return jsonError(500, "bulk_create_failed", "Could not create products");
  }
}
