import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma, withBrand } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializers/product";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";
import { publicProductsQuerySchema } from "@/lib/validators/publicCatalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = publicProductsQuerySchema.safeParse(
    Object.fromEntries(searchParams.entries()),
  );

  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid query", parsed.error.flatten());
  }

  const brand = await prisma.brand.findUnique({
    where: { slug: parsed.data.brandSlug },
  });

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  const paginationParams = new URLSearchParams();
  if (parsed.data.page) {
    paginationParams.set("page", String(parsed.data.page));
  }
  if (parsed.data.pageSize) {
    paginationParams.set("pageSize", String(parsed.data.pageSize));
  }

  const { take, skip, page, pageSize } = parsePagination(paginationParams, {
    defaultPageSize: 12,
    maxPageSize: 50,
  });

  const where: Prisma.ProductWhereInput = {
    brandId: brand.id,
    isActive: true,
  };

  if (parsed.data.categoryId) {
    where.categoryId = parsed.data.categoryId;
  }

  if (parsed.data.q) {
    where.OR = [
      { name: { contains: parsed.data.q, mode: "insensitive" } },
      { sku: { contains: parsed.data.q, mode: "insensitive" } },
    ];
  }

  const include = {
    category: true,
    variations: {
      where: { brandId: brand.id },
      orderBy: { createdAt: "asc" as const },
      include: {
        images: {
          where: { brandId: brand.id },
          orderBy: { sortOrder: "asc" as const },
        },
      },
    },
  };

  return withBrand(brand.id, async (tx) => {
    const [items, total] = await Promise.all([
      tx.product.findMany({
        where,
        include,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.product.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        items: items.map((item) => serializeProduct(item)),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });
}
