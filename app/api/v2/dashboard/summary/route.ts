import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const shareLinksWhere =
    auth.role === "SELLER"
      ? { brandId: auth.brandId, ownerUserId: auth.userId }
      : { brandId: auth.brandId };

  return withBrand(auth.brandId, async (tx) => {
    const [
      totalBaseProducts,
      activeBaseProducts,
      latestImportedProduct,
      latestUpdatedBaseProduct,
      totalCategories,
      totalSubcategories,
      integrationConnections,
      totalCatalogs,
      totalCatalogItems,
      shareLinks,
    ] = await Promise.all([
      tx.productBaseV2.count({
        where: { brandId: auth.brandId },
      }),
      tx.productBaseV2.count({
        where: {
          brandId: auth.brandId,
          isActive: true,
        },
      }),
      tx.productBaseV2.findFirst({
        where: {
          brandId: auth.brandId,
          sourceType: {
            in: ["CSV", "INTEGRATION"],
          },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          updatedAt: true,
          sourceType: true,
        },
      }),
      tx.productBaseV2.findFirst({
        where: {
          brandId: auth.brandId,
        },
        orderBy: { updatedAt: "desc" },
        select: {
          updatedAt: true,
        },
      }),
      tx.categoryV2.count({
        where: { brandId: auth.brandId },
      }),
      tx.subcategoryV2.count({
        where: { brandId: auth.brandId },
      }),
      tx.integrationConnectionV2.findMany({
        where: { brandId: auth.brandId },
        select: {
          provider: true,
          status: true,
          lastSyncError: true,
        },
      }),
      tx.catalogV2.count({
        where: { brandId: auth.brandId },
      }),
      tx.catalogItemV2.count({
        where: { brandId: auth.brandId },
      }),
      tx.shareLinkV2.findMany({
        where: shareLinksWhere,
        select: {
          isRevoked: true,
        },
      }),
    ]);

    const connectedIntegrations = integrationConnections.filter(
      (connection) => connection.status === "CONNECTED",
    );
    const healthyIntegrations = connectedIntegrations.filter(
      (connection) => !connection.lastSyncError,
    );

    const activeShareLinks = shareLinks.filter((shareLink) => !shareLink.isRevoked).length;
    const revokedShareLinks = shareLinks.length - activeShareLinks;

    return NextResponse.json({
      ok: true,
      data: {
        baseProducts: {
          total: totalBaseProducts,
          active: activeBaseProducts,
          latestImportedAt: latestImportedProduct?.updatedAt ?? null,
          latestImportedSourceType: latestImportedProduct?.sourceType ?? null,
          latestUpdatedAt: latestUpdatedBaseProduct?.updatedAt ?? null,
        },
        categories: {
          categoriesTotal: totalCategories,
          subcategoriesTotal: totalSubcategories,
        },
        integrations: {
          totalConnections: integrationConnections.length,
          connected: connectedIntegrations.length,
          healthy: healthyIntegrations.length,
          providers: connectedIntegrations.map((connection) => connection.provider),
        },
        catalogs: {
          total: totalCatalogs,
          itemsTotal: totalCatalogItems,
        },
        shareLinks: {
          total: shareLinks.length,
          active: activeShareLinks,
          revoked: revokedShareLinks,
        },
      },
    });
  });
}
