import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const SKU_REGEX = /^\d{4}$/;

type UpdatePayload = {
  sku?: string;
  name?: string;
  description?: string;
  brand?: string | null;
  barcode?: string | null;
  size?: string | null;
  isActive?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId")) {
    return { error: jsonError(400, "validation_error", "brandId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  const data: UpdatePayload = {};

  if (hasOwn(body, "sku")) {
    if (typeof body.sku !== "string") {
      return { error: jsonError(400, "validation_error", "SKU must be a string") };
    }
    const sku = body.sku.trim();
    if (!SKU_REGEX.test(sku)) {
      return {
        error: jsonError(400, "validation_error", "SKU must have exactly 4 digits"),
      };
    }
    data.sku = sku;
  }

  if (hasOwn(body, "name")) {
    if (typeof body.name !== "string") {
      return { error: jsonError(400, "validation_error", "Name must be a string") };
    }
    const name = body.name.trim();
    if (name.length < 2) {
      return {
        error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
      };
    }
    if (name.startsWith("#")) {
      return {
        error: jsonError(
          400,
          "validation_error",
          "Name starting with # is not allowed",
        ),
      };
    }
    data.name = name;
  }

  if (hasOwn(body, "description")) {
    if (typeof body.description !== "string") {
      return {
        error: jsonError(400, "validation_error", "Description must be a string"),
      };
    }
    data.description = body.description;
  }

  if (hasOwn(body, "brand")) {
    if (body.brand === null) {
      data.brand = null;
    } else if (typeof body.brand === "string") {
      const value = body.brand.trim();
      data.brand = value.length > 0 ? value : null;
    } else {
      return {
        error: jsonError(400, "validation_error", "brand must be a string"),
      };
    }
  }

  if (hasOwn(body, "barcode")) {
    if (body.barcode === null) {
      data.barcode = null;
    } else if (typeof body.barcode === "string") {
      const value = body.barcode.trim();
      data.barcode = value.length > 0 ? value : null;
    } else {
      return {
        error: jsonError(400, "validation_error", "barcode must be a string"),
      };
    }
  }

  if (hasOwn(body, "size")) {
    if (body.size === null) {
      data.size = null;
    } else if (typeof body.size === "string") {
      const value = body.size.trim();
      data.size = value.length > 0 ? value : null;
    } else {
      return {
        error: jsonError(400, "validation_error", "size must be a string"),
      };
    }
  }

  if (hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") {
      return {
        error: jsonError(400, "validation_error", "isActive must be a boolean"),
      };
    }
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return {
      error: jsonError(400, "validation_error", "At least one field is required"),
    };
  }

  return { data };
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

  const baseProduct = await withBrand(auth.brandId, (tx) =>
    tx.productBaseV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!baseProduct) {
    return jsonError(404, "not_found", "Base product not found");
  }

  return NextResponse.json({ ok: true, data: baseProduct });
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

  try {
    const updated = await withBrand(auth.brandId, async (tx) => {
      const result = await tx.productBaseV2.updateMany({
        where: {
          id,
          brandId: auth.brandId,
        },
        data: parsed.data,
      });

      if (result.count === 0) {
        return null;
      }

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
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "base_product_conflict", "SKU already exists");
    }
    return jsonError(500, "base_product_update_failed", "Could not update base product");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const result = await withBrand(auth.brandId, (tx) =>
    tx.productBaseV2.deleteMany({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (result.count === 0) {
    return jsonError(404, "not_found", "Base product not found");
  }

  return NextResponse.json({ ok: true });
}
