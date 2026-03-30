import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { serializeVariation } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { variationCreateSchema } from "@/lib/validators/product";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  const parsed = variationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const product = await withBrand(auth.brandId, (tx) =>
    tx.product.findFirst({
      where: {
        id,
        brandId: auth.brandId,
        isActive: true,
      },
    }),
  );

  if (!product) {
    return jsonError(404, "not_found", "Product not found");
  }

  const variation = await withBrand(auth.brandId, (tx) =>
    tx.productVariation.create({
      data: {
        brandId: auth.brandId,
        productId: product.id,
        variantType: parsed.data.variantType,
        variantValue: parsed.data.variantValue,
        price: parsed.data.price,
        stockQuantity: parsed.data.stockQuantity,
        barcode: parsed.data.barcode,
      },
    }),
  );

  return NextResponse.json(
    { ok: true, data: serializeVariation(variation) },
    { status: 201 },
  );
}
