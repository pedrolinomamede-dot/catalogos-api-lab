import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { productUpdateSchema } from "@/lib/validators/product";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  if (includeDeleted && auth.role !== "ADMIN") {
    return jsonError(403, "forbidden", "Not authorized");
  }

  const where: Prisma.ProductWhereInput = {
    id,
    brandId: auth.brandId,
  };

  if (!includeDeleted) {
    where.isActive = true;
  }

  const product = await withBrand(auth.brandId, (tx) =>
    tx.product.findFirst({
      where,
      include: {
        category: true,
        variations: {
          where: { brandId: auth.brandId },
          orderBy: { createdAt: "asc" },
          include: {
            images: {
              where: { brandId: auth.brandId },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    }),
  );

  if (!product) {
    return jsonError(404, "not_found", "Product not found");
  }

  return NextResponse.json({ ok: true, data: serializeProduct(product) });
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

  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const product = await withBrand(auth.brandId, (tx) =>
    tx.product.findFirst({
      where: {
        id,
        brandId: auth.brandId,
        isActive: true,
      },
    }),
  );

  if (!product) {
    return jsonError(404, "not_found", "Product not found");
  }

  try {
    return await withBrand(auth.brandId, async (tx) => {
      if (parsed.data.categoryId !== undefined) {
        if (parsed.data.categoryId === null) {
          // Explicitly clearing category.
        } else {
          const category = await tx.category.findFirst({
            where: {
              id: parsed.data.categoryId,
              brandId: auth.brandId,
            },
          });

          if (!category) {
            return jsonError(400, "invalid_category", "Category not found");
          }
        }
      }

      const nextCategoryId =
        parsed.data.categoryId === null
          ? null
          : parsed.data.categoryId ?? undefined;

      const updated = await tx.product.update({
        where: { id: product.id },
        data: {
          categoryId: nextCategoryId,
          sku: parsed.data.sku?.trim(),
          name: parsed.data.name?.trim(),
          description: parsed.data.description,
          isActive: parsed.data.isActive,
        },
      });

      return NextResponse.json({ ok: true, data: updated });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "product_conflict", "Product SKU already exists");
    }
    return jsonError(500, "product_update_failed", "Could not update product");
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

  const product = await withBrand(auth.brandId, (tx) =>
    tx.product.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!product) {
    return jsonError(404, "not_found", "Product not found");
  }

  await withBrand(auth.brandId, (tx) =>
    tx.product.update({
      where: { id: product.id },
      data: {
        isActive: false,
      },
    }),
  );

  return NextResponse.json({ ok: true });
}
