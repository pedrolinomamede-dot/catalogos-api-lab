import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { imageCreateSchema } from "@/lib/validators/product";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ variationId: string }> },
) {
  const { variationId } = await context.params;
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

  const parsed = imageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const variation = await withBrand(auth.brandId, (tx) =>
    tx.productVariation.findFirst({
      where: {
        id: variationId,
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

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    const maxPosition = await withBrand(auth.brandId, (tx) =>
      tx.productImage.aggregate({
        where: {
          variationId: variation.id,
          brandId: auth.brandId,
        },
        _max: {
          sortOrder: true,
        },
      }),
    );
    sortOrder = (maxPosition._max.sortOrder ?? -1) + 1;
  }

  const image = await withBrand(auth.brandId, (tx) =>
    tx.productImage.create({
      data: {
        brandId: auth.brandId,
        variationId: variation.id,
        imageUrl: parsed.data.imageUrl,
        thumbnailUrl: parsed.data.thumbnailUrl,
        altText: parsed.data.altText,
        sortOrder,
      },
    }),
  );

  return NextResponse.json({ ok: true, data: image }, { status: 201 });
}
