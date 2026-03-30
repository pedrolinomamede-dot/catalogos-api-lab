import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { refreshCatalogItemSnapshot } from "@/lib/catalog-snapshots/refresh-catalog-item-snapshot";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const item = await tx.catalogItemV2.findFirst({
      where: {
        id: itemId,
        catalogId: id,
        brandId: auth.brandId,
      },
      select: {
        id: true,
        productBaseId: true,
      },
    });

    if (!item) {
      return jsonError(404, "not_found", "Catalog item not found");
    }

    const snapshot = await refreshCatalogItemSnapshot(tx, {
      brandId: auth.brandId,
      catalogItemId: item.id,
      productBaseId: item.productBaseId,
    });

    return NextResponse.json({ ok: true, data: snapshot });
  });
}
