import { NextResponse } from "next/server";

import { prisma, withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { publicBrandQuerySchema } from "@/lib/validators/publicCatalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = publicBrandQuerySchema.safeParse(
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

  const categories = await withBrand(brand.id, (tx) =>
    tx.category.findMany({
      where: { brandId: brand.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  );

  return NextResponse.json({
    ok: true,
    data: categories,
  });
}
