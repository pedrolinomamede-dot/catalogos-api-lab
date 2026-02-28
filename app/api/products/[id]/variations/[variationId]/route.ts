import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { serializeVariation } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { variationUpdateSchema } from "@/lib/validators/product";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; variationId: string }> },
) {
  const { id, variationId } = await context.params;
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

  const parsed = variationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const variation = await withBrand(auth.brandId, (tx) =>
    tx.productVariation.findFirst({
      where: {
        id: variationId,
        productId: id,
        brandId: auth.brandId,
        product: {
          isActive: true,
        },
      },
    }),
  );

  if (!variation) {
    return jsonError(404, "not_found", "Variation not found");
  }

  const updated = await withBrand(auth.brandId, (tx) =>
    tx.productVariation.update({
      where: { id: variation.id },
      data: {
        variantType: parsed.data.variantType,
        variantValue: parsed.data.variantValue,
        price: parsed.data.price,
        stockQuantity: parsed.data.stockQuantity,
        barcode: parsed.data.barcode,
      },
    }),
  );

  return NextResponse.json({ ok: true, data: serializeVariation(updated) });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; variationId: string }> },
) {
  const { id, variationId } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const variation = await withBrand(auth.brandId, (tx) =>
    tx.productVariation.findFirst({
      where: {
        id: variationId,
        productId: id,
        brandId: auth.brandId,
        product: {
          isActive: true,
        },
      },
    }),
  );

  if (!variation) {
    return jsonError(404, "not_found", "Variation not found");
  }

  await withBrand(auth.brandId, (tx) =>
    tx.productVariation.delete({
      where: { id: variation.id },
    }),
  );

  return NextResponse.json({ ok: true });
}
