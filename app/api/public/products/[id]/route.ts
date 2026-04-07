import { NextRequest, NextResponse } from "next/server";

import { prisma, withBrand } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { publicBrandQuerySchema } from "@/lib/validators/publicCatalog";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const parsed = publicBrandQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid query", parsed.error.flatten());
  }

  const brand = await prisma.brand.findFirst({
    where: { slug: parsed.data.brandSlug, isActive: true },
  });

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  const product = await withBrand(brand.id, (tx) =>
    tx.product.findFirst({
      where: {
        id,
        brandId: brand.id,
        isActive: true,
      },
      include: {
        category: true,
        variations: {
          where: { brandId: brand.id },
          orderBy: { createdAt: "asc" },
          include: {
            images: {
              where: { brandId: brand.id },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
  );

  if (!product) {
    return jsonError(404, "not_found", "Product not found");
  }

  return NextResponse.json({ ok: true, data: serializeProduct(product) });
}
