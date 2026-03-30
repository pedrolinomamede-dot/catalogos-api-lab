import { NextRequest, NextResponse } from "next/server";

import { prisma, withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token: identifier } = await context.params;

  if (!identifier || identifier.trim().length === 0) {
    return jsonError(400, "validation_error", "Invalid token");
  }

  const normalizedIdentifier = identifier.trim();

  const shareLink = await prisma.shareLinkV2.findFirst({
    where: {
      OR: [{ slug: normalizedIdentifier }, { token: normalizedIdentifier }],
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
        slug: shareLink.slug,
        catalogs: catalogs.map((item) => item.catalog),
      },
    });
  });
}
