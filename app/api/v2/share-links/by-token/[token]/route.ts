import { NextRequest, NextResponse } from "next/server";

import { prisma, withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  if (!token || token.trim().length === 0) {
    return jsonError(400, "validation_error", "Invalid token");
  }

  const shareLink = await prisma.shareLinkV2.findFirst({
    where: {
      token: token.trim(),
      isRevoked: false,
    },
  });

  if (!shareLink) {
    return jsonError(404, "not_found", "Share link not found");
  }

  return withBrand(shareLink.brandId, async (tx) => {
    const catalogs = await tx.shareLinkCatalogV2.findMany({
      where: {
        shareLinkId: shareLink.id,
        brandId: shareLink.brandId,
      },
      include: {
        catalog: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: shareLink.id,
        brandId: shareLink.brandId,
        name: shareLink.name,
        catalogs: catalogs.map((item) => item.catalog),
      },
    });
  });
}
