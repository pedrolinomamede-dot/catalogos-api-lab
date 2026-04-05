import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type UpdatePayload = {
  status: "BILLED" | "CANCELED";
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (body.status !== "BILLED" && body.status !== "CANCELED") {
    return {
      error: jsonError(400, "validation_error", "Invalid target status"),
    };
  }

  return {
    data: {
      status: body.status,
    } satisfies UpdatePayload,
  };
}

function serializeOrderIntent(
  item: Prisma.OrderIntentGetPayload<{
    include: {
      shareLink: {
        select: {
          name: true;
          slug: true;
        };
      };
    };
  }>,
) {
  const { shareLink, subtotal, ...orderIntent } = item;

  return {
    ...orderIntent,
    subtotal: subtotal ? subtotal.toNumber() : null,
    shareLinkName: shareLink?.name ?? null,
    shareLinkSlug: shareLink?.slug ?? null,
  };
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

  const parsed = parseUpdatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  return withBrand(auth.brandId, async (tx) => {
    const existing = await tx.orderIntent.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
      include: {
        shareLink: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!existing) {
      return jsonError(404, "not_found", "Order intent not found");
    }

    if (existing.status === parsed.data.status) {
      return NextResponse.json({
        ok: true,
        data: serializeOrderIntent(existing),
      });
    }

    if (existing.status !== "OPEN") {
      return jsonError(
        409,
        "invalid_status_transition",
        "Only open intents can be updated",
      );
    }

    const now = new Date();
    const updated = await tx.orderIntent.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        billedAt: parsed.data.status === "BILLED" ? now : null,
        canceledAt: parsed.data.status === "CANCELED" ? now : null,
      },
      include: {
        shareLink: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: serializeOrderIntent(updated),
    });
  });
}
