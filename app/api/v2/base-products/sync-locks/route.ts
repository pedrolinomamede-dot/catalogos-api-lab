import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const updateSyncLocksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  locked: z.boolean(),
  reason: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(request: Request) {
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

  const parsed = updateSyncLocksSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      "Invalid base product sync lock payload",
      parsed.error.flatten(),
    );
  }

  const reason = parsed.data.locked
    ? parsed.data.reason?.trim() || "Bloqueado manualmente na Base Geral."
    : null;

  const updatedCount = await withBrand(auth.brandId, async (tx) => {
    const result = await tx.productBaseV2.updateMany({
      where: {
        brandId: auth.brandId,
        id: { in: parsed.data.ids },
        sourceType: "INTEGRATION",
      },
      data: {
        integrationSyncLocked: parsed.data.locked,
        integrationSyncLockedAt: parsed.data.locked ? new Date() : null,
        integrationSyncLockedByUserId: parsed.data.locked ? auth.userId : null,
        integrationSyncLockReason: reason,
      },
    });

    return result.count;
  });

  return NextResponse.json({
    ok: true,
    data: {
      updatedCount,
    },
  });
}
