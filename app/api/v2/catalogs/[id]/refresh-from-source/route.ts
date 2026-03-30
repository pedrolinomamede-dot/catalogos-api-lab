import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { refreshCatalogItemSnapshot } from "@/lib/catalog-snapshots/refresh-catalog-item-snapshot";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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
      select: { id: true },
    });

    if (!catalog) {
      return jsonError(404, "not_found", "Catalog not found");
    }

    const items = await tx.catalogItemV2.findMany({
      where: {
        catalogId: id,
        brandId: auth.brandId,
      },
      select: {
        id: true,
        productBaseId: true,
      },
    });

    const refreshed = await Promise.all(
      items.map((item) =>
        refreshCatalogItemSnapshot(tx, {
          brandId: auth.brandId,
          catalogItemId: item.id,
          productBaseId: item.productBaseId,
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      data: {
        refreshedCount: refreshed.length,
      },
    });
  });
}
