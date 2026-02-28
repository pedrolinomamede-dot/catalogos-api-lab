import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { createCategorySchema } from "@/lib/validators/category";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { categories, counts } = await withBrand(auth.brandId, async (tx) => {
    const categoriesResult = await tx.category.findMany({
      where: { brandId: auth.brandId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const countsResult = await tx.product.groupBy({
      by: ["categoryId"],
      where: {
        brandId: auth.brandId,
        isActive: true,
        categoryId: { not: null },
      },
      _count: { _all: true },
    });

    return { categories: categoriesResult, counts: countsResult };
  });

  const countMap = new Map(
    counts.map((entry) => [entry.categoryId, entry._count._all]),
  );

  return NextResponse.json({
    ok: true,
    data: categories.map((category) => ({
      ...category,
      productCount: countMap.get(category.id) ?? 0,
    })),
    meta: {
      total: categories.length,
    },
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

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  try {
    const category = await withBrand(auth.brandId, (tx) =>
      tx.category.create({
        data: {
          brandId: auth.brandId,
          name: parsed.data.name.trim(),
          icon: parsed.data.icon,
          color: parsed.data.color,
          sortOrder: parsed.data.sortOrder,
        },
      }),
    );

    return NextResponse.json({ ok: true, data: category }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "category_conflict", "Category already exists");
    }
    return jsonError(500, "category_create_failed", "Could not create category");
  }
}
