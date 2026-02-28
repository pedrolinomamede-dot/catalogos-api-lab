import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ variationId: string; imageId: string }> },
) {
  const { variationId, imageId } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const image = await withBrand(auth.brandId, (tx) =>
    tx.productImage.findFirst({
      where: {
        id: imageId,
        variationId,
        brandId: auth.brandId,
        variation: {
          product: {
            isActive: true,
          },
        },
      },
    }),
  );

  if (!image) {
    return jsonError(404, "not_found", "Image not found");
  }

  await withBrand(auth.brandId, (tx) =>
    tx.productImage.delete({
      where: { id: image.id },
    }),
  );

  return NextResponse.json({ ok: true });
}
