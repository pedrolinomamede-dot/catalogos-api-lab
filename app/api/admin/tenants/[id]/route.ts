import { NextRequest, NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  if (!isPlainObject(body) || typeof body.isActive !== "boolean") {
    return jsonError(400, "validation_error", "isActive is required");
  }

  const existing = await prisma.brand.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return jsonError(404, "not_found", "Brand not found");
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: { isActive: body.isActive },
  });

  const [usersCount, shareLinksCount, orderIntentsCount, productRequestsCount] =
    await Promise.all([
      prisma.user.count({ where: { brandId: updated.id } }),
      prisma.shareLinkV2.count({ where: { brandId: updated.id } }),
      prisma.orderIntent.count({ where: { brandId: updated.id } }),
      prisma.productRequest.count({ where: { brandId: updated.id } }),
    ]);

  return NextResponse.json({
    ok: true,
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      usersCount,
      shareLinksCount,
      orderIntentsCount,
      productRequestsCount,
    },
  });
}
