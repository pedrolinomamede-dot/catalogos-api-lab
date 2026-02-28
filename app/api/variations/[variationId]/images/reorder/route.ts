import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { imageReorderSchema } from "@/lib/validators/product";

export async function PATCH(
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

  const parsed = imageReorderSchema.safeParse(body);
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

  const images = await withBrand(auth.brandId, (tx) =>
    tx.productImage.findMany({
      where: {
        variationId: variation.id,
        brandId: auth.brandId,
      },
      select: {
        id: true,
      },
    }),
  );

  if (images.length === 0) {
    return jsonError(400, "no_images", "No images to reorder");
  }

  const existingIds = new Set(images.map((image) => image.id));
  const orderedIds = parsed.data.orderedIds;

  if (new Set(orderedIds).size !== orderedIds.length) {
    return jsonError(400, "invalid_order", "Duplicate image ids provided");
  }

  if (orderedIds.length !== images.length) {
    return jsonError(
      400,
      "invalid_order",
      "orderedIds must include all images for the variation",
    );
  }

  const hasUnknownId = orderedIds.some((id) => !existingIds.has(id));
  if (hasUnknownId) {
    return jsonError(400, "invalid_order", "orderedIds contains invalid ids");
  }

  await withBrand(auth.brandId, (tx) =>
    tx.$transaction(
      orderedIds.map((id, index) =>
        tx.productImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    ),
  );

  return NextResponse.json({ ok: true });
}
