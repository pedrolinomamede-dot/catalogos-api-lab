import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const catalog = await tx.catalogV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!catalog) {
      return jsonError(404, "not_found", "Catalog not found");
    }

    const item = await tx.catalogItemV2.findFirst({
      where: {
        id: itemId,
        catalogId: catalog.id,
        brandId: auth.brandId,
      },
    });

    if (!item) {
      return jsonError(404, "not_found", "Catalog item not found");
    }

    await tx.catalogItemV2.delete({
      where: {
        id: item.id,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
