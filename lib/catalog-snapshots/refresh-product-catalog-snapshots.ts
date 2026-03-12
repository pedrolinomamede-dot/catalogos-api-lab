import type { Prisma, PrismaClient } from "@prisma/client";

import { createOrRefreshCatalogItemSnapshot } from "@/lib/catalog-snapshots/create-catalog-item-snapshot";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function refreshProductCatalogSnapshots(
  tx: Tx,
  input: {
    brandId: string;
    productBaseId: string;
  },
) {
  const items = await tx.catalogItemV2.findMany({
    where: {
      brandId: input.brandId,
      productBaseId: input.productBaseId,
    },
    select: {
      id: true,
      productBaseId: true,
    },
  });

  const refreshed = await Promise.all(
    items.map((item) =>
      createOrRefreshCatalogItemSnapshot(tx, {
        brandId: input.brandId,
        catalogItemId: item.id,
        productBaseId: item.productBaseId,
      }),
    ),
  );

  return {
    refreshedCount: refreshed.filter(Boolean).length,
  };
}
