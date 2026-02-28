import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type RevokePayload = {
  action: "revoke";
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseRevokePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (
    hasOwn(body, "brandId") ||
    hasOwn(body, "tenantId") ||
    hasOwn(body, "token") ||
    hasOwn(body, "catalogIds") ||
    hasOwn(body, "id")
  ) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (body.action !== "revoke") {
    return { error: jsonError(400, "validation_error", "Invalid action") };
  }

  return { data: { action: "revoke" } satisfies RevokePayload };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const shareLink = await withBrand(auth.brandId, (tx) =>
    tx.shareLinkV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
      include: {
        catalogs: {
          include: {
            catalog: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    }),
  );

  if (!shareLink) {
    return jsonError(404, "not_found", "Share link not found");
  }

  const { catalogs, ...rest } = shareLink;

  return NextResponse.json({
    ok: true,
    data: {
      ...rest,
      catalogs: catalogs.map((item) => item.catalog),
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = parseRevokePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  return withBrand(auth.brandId, async (tx) => {
    const shareLink = await tx.shareLinkV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!shareLink) {
      return jsonError(404, "not_found", "Share link not found");
    }

    if (shareLink.isRevoked) {
      return NextResponse.json({ ok: true, data: shareLink });
    }

    const updated = await tx.shareLinkV2.update({
      where: { id: shareLink.id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const dryRunParam = request.nextUrl.searchParams.get("dryRun");
  const isDryRun = dryRunParam === "1" || dryRunParam === "true";

  return withBrand(auth.brandId, async (tx) => {
    const shareLink = await tx.shareLinkV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!shareLink) {
      return jsonError(404, "not_found", "Share link not found");
    }

    const catalogCount = await tx.shareLinkCatalogV2.count({
      where: {
        shareLinkId: shareLink.id,
        brandId: auth.brandId,
      },
    });

    if (isDryRun) {
      return NextResponse.json({
        ok: true,
        data: {
          catalogsCount: catalogCount,
        },
      });
    }

    await tx.shareLinkV2.delete({
      where: { id: shareLink.id },
    });

    return NextResponse.json({ ok: true });
  });
}

