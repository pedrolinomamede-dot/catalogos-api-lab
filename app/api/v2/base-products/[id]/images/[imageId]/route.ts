import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id, imageId } = await params;

  return withBrand(auth.brandId, async (tx) => {
    const image = await tx.productBaseImageV2.findFirst({
      where: { id: imageId, productBaseId: id, brandId: auth.brandId },
    });

    if (!image) {
      return jsonError(404, "not_found", "Image not found");
    }

    await tx.productBaseImageV2.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ ok: true });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id, imageId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const { sortOrder } = body as { sortOrder?: number };

  return withBrand(auth.brandId, async (tx) => {
    const image = await tx.productBaseImageV2.findFirst({
      where: { id: imageId, productBaseId: id, brandId: auth.brandId },
    });

    if (!image) {
      return jsonError(404, "not_found", "Image not found");
    }

    const updated = await tx.productBaseImageV2.update({
      where: { id: imageId },
      data: { sortOrder: sortOrder ?? image.sortOrder },
    });

    return NextResponse.json(updated);
  });
}
