import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";
import { productCreateSchema } from "@/lib/validators/product";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  if (includeDeleted && auth.role !== "ADMIN") {
    return jsonError(403, "forbidden", "Not authorized");
  }

  const q = searchParams.get("q")?.trim() || searchParams.get("search")?.trim();
  const categoryIdParam = searchParams.get("categoryId")?.trim() || undefined;
  const categoryName = searchParams.get("category")?.trim() || undefined;
  const isActiveParam = searchParams.get("isActive");

  let isActive: boolean | undefined;
  if (isActiveParam !== null) {
    if (isActiveParam === "true") {
      isActive = true;
    } else if (isActiveParam === "false") {
      isActive = false;
    } else {
      return jsonError(400, "invalid_query", "Invalid isActive value");
    }
  }

  return withBrand(auth.brandId, async (tx) => {
    let categoryId = categoryIdParam;
    if (!categoryId && categoryName) {
      const category = await tx.category.findFirst({
        where: {
          brandId: auth.brandId,
          name: { equals: categoryName, mode: "insensitive" },
        },
      });
      if (!category) {
        return jsonError(400, "invalid_category", "Category not found");
      }
      categoryId = category.id;
    }

    const { take, skip, page, pageSize } = parsePagination(searchParams);

    const where: Prisma.ProductWhereInput = {
      brandId: auth.brandId,
    };

    if (!includeDeleted) {
      where.isActive = true;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      tx.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.product.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });
}

export async function POST(request: Request) {
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

  const parsed = productCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  try {
    return await withBrand(auth.brandId, async (tx) => {
      if (parsed.data.categoryId) {
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

      const variations =
        parsed.data.variations?.map((variation) => ({
          brandId: auth.brandId,
          variantType: variation.variantType,
          variantValue: variation.variantValue,
          price: variation.price,
          stockQuantity: variation.stockQuantity,
          barcode: variation.barcode,
        })) ?? [];

      const product = await tx.product.create({
        data: {
          brandId: auth.brandId,
          categoryId: parsed.data.categoryId ?? null,
          sku: parsed.data.sku.trim(),
          name: parsed.data.name.trim(),
          description: parsed.data.description,
          isActive: parsed.data.isActive ?? true,
          variations: variations.length
            ? {
                create: variations,
              }
            : undefined,
        },
        include: {
          variations: true,
        },
      });

      return NextResponse.json(
        { ok: true, data: serializeProduct(product) },
        { status: 201 },
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "product_conflict", "Product SKU already exists");
    }
    return jsonError(500, "product_create_failed", "Could not create product");
  }
}
