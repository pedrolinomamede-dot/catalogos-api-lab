import type { Prisma, PrismaClient } from "@prisma/client";

import { createOrRefreshCatalogItemSnapshot } from "@/lib/catalog-snapshots/create-catalog-item-snapshot";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function refreshCatalogItemSnapshot(
  tx: Tx,
  input: {
    brandId: string;
    catalogItemId: string;
    productBaseId: string;
  },
) {
  return createOrRefreshCatalogItemSnapshot(tx, input);
}
