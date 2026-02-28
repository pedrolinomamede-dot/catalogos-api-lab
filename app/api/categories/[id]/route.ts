import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { updateCategorySchema } from "@/lib/validators/category";

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
    tx.category.findFirst({
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

  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const category = await withBrand(auth.brandId, (tx) =>
    tx.category.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!category) {
    return jsonError(404, "not_found", "Category not found");
  }

  try {
    const updated = await withBrand(auth.brandId, (tx) =>
      tx.category.update({
        where: { id: category.id },
        data: {
          name: parsed.data.name?.trim(),
          icon: parsed.data.icon,
          color: parsed.data.color,
          sortOrder: parsed.data.sortOrder,
        },
      }),
    );

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
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const category = await withBrand(auth.brandId, (tx) =>
    tx.category.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!category) {
    return jsonError(404, "not_found", "Category not found");
  }

  const productCount = await withBrand(auth.brandId, (tx) =>
    tx.product.count({
      where: {
        brandId: auth.brandId,
        categoryId: category.id,
      },
    }),
  );

  if (productCount > 0) {
    return jsonError(
      409,
      "category_has_products",
      "Category has products and cannot be deleted",
    );
  }

  await withBrand(auth.brandId, (tx) =>
    tx.category.delete({
      where: { id: category.id },
    }),
  );

  return NextResponse.json({ ok: true });
}
