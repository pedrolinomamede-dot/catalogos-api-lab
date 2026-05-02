import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { refreshProductCatalogSnapshots } from "@/lib/catalog-snapshots/refresh-product-catalog-snapshots";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type ImagePayload = {
  imageUrl: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parsePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "brandId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  if (!hasOwn(body, "imageUrl")) {
    return {
      error: jsonError(400, "validation_error", "imageUrl is required"),
    };
  }

  const raw = body.imageUrl;
  if (raw === null) {
    return { data: { imageUrl: null } satisfies ImagePayload };
  }

  if (typeof raw !== "string") {
    return {
      error: jsonError(400, "validation_error", "imageUrl must be a string"),
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      error: jsonError(400, "validation_error", "imageUrl must be a string"),
    };
  }

  return { data: { imageUrl: trimmed } satisfies ImagePayload };
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

  const parsed = parsePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  try {
    const updated = await withBrand(auth.brandId, async (tx) => {
      const baseProduct = await tx.productBaseV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
        select: {
          id: true,
          imageUrl: true,
        },
      });

      if (!baseProduct) {
        return null;
      }

      const nextImageUrl = parsed.data.imageUrl;
      if (nextImageUrl === null && baseProduct.imageUrl) {
        await tx.productBaseImageV2.deleteMany({
          where: {
            brandId: auth.brandId,
            productBaseId: id,
            imageUrl: baseProduct.imageUrl,
          },
        });
      }

      await tx.productBaseV2.update({
        where: {
          id: baseProduct.id,
        },
        data: {
          imageUrl: nextImageUrl,
        },
      });

      await refreshProductCatalogSnapshots(tx, {
        brandId: auth.brandId,
        productBaseId: baseProduct.id,
      });

      return tx.productBaseV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });
    });

    if (!updated) {
      return jsonError(404, "not_found", "Base product not found");
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("[base-products/image][PATCH] failed", error);
    return jsonError(500, "base_product_image_update_failed", "Could not update main image");
  }
}
