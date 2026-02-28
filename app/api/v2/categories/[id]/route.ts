import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type UpdatePayload = {
  name?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    return { error: jsonError(400, "validation_error", "Name must be a string") };
  }

  const name = value.trim();
  if (name.length < 2) {
    return {
      error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
    };
  }

  return { name };
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  const data: UpdatePayload = {};

  if (hasOwn(body, "name")) {
    const parsedName = parseName(body.name);
    if (parsedName.error) {
      return { error: parsedName.error };
    }
    data.name = parsedName.name;
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

  const category = await withBrand(auth.brandId, (tx) =>
    tx.categoryV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!category) {
    return jsonError(404, "not_found", "Category not found");
  }

  return NextResponse.json({ ok: true, data: category });
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
      const result = await tx.categoryV2.updateMany({
        where: {
          id,
          brandId: auth.brandId,
        },
        data: parsed.data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.categoryV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });
    });

    if (!updated) {
      return jsonError(404, "not_found", "Category not found");
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "category_conflict", "Category already exists");
    }
    return jsonError(500, "category_update_failed", "Could not update category");
  }
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
    const category = await tx.categoryV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!category) {
      return jsonError(404, "not_found", "Category not found");
    }

    const [productCount, subcategoryCount] = await Promise.all([
      tx.productBaseV2.count({
        where: {
          brandId: auth.brandId,
          categoryId: category.id,
        },
      }),
      tx.subcategoryV2.count({
        where: {
          brandId: auth.brandId,
          categoryId: category.id,
        },
      }),
    ]);

    if (isDryRun) {
      return NextResponse.json({
        ok: true,
        data: {
          productsCount: productCount,
          subcategoriesCount: subcategoryCount,
        },
      });
    }

    await tx.categoryV2.deleteMany({
      where: {
        id: category.id,
        brandId: auth.brandId,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
