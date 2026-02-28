import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AssociationPayload = {
  categoryId: string;
  subcategoryId?: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function parsePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  if (!hasOwn(body, "categoryId") || typeof body.categoryId !== "string") {
    return {
      error: jsonError(400, "validation_error", "categoryId is required"),
    };
  }

  const categoryId = body.categoryId.trim();
  if (!isUuid(categoryId)) {
    return {
      error: jsonError(400, "validation_error", "categoryId must be a UUID"),
    };
  }

  let subcategoryId: string | null | undefined;
  if (hasOwn(body, "subcategoryId")) {
    if (body.subcategoryId === null) {
      subcategoryId = null;
    } else if (typeof body.subcategoryId === "string") {
      const trimmed = body.subcategoryId.trim();
      if (!isUuid(trimmed)) {
        return {
          error: jsonError(400, "validation_error", "subcategoryId must be a UUID"),
        };
      }
      subcategoryId = trimmed;
    } else {
      return {
        error: jsonError(400, "validation_error", "subcategoryId must be a UUID"),
      };
    }
  }

  return { data: { categoryId, subcategoryId } satisfies AssociationPayload };
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

  return withBrand(auth.brandId, async (tx) => {
    const baseProduct = await tx.productBaseV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!baseProduct) {
      return jsonError(404, "not_found", "Base product not found");
    }

    const category = await tx.categoryV2.findFirst({
      where: {
        id: parsed.data.categoryId,
        brandId: auth.brandId,
      },
    });

    if (!category) {
      return jsonError(404, "not_found", "Category not found");
    }

    let subcategoryId: string | null = null;

    if (parsed.data.subcategoryId !== undefined) {
      if (parsed.data.subcategoryId === null) {
        subcategoryId = null;
      } else {
        const subcategory = await tx.subcategoryV2.findFirst({
          where: {
            id: parsed.data.subcategoryId,
            brandId: auth.brandId,
          },
        });

        if (!subcategory) {
          return jsonError(404, "not_found", "Subcategory not found");
        }

        if (subcategory.categoryId !== category.id) {
          return jsonError(
            400,
            "invalid_subcategory",
            "Subcategory does not belong to category",
          );
        }

        subcategoryId = subcategory.id;
      }
    }

    const updated = await tx.productBaseV2.update({
      where: { id: baseProduct.id },
      data: {
        categoryId: category.id,
        subcategoryId,
      },
    });

    return NextResponse.json({ ok: true, data: updated });
  });
}
