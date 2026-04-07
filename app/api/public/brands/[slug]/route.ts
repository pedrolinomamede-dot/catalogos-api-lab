import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const slugSchema = z.string().min(1);
  const parsed = slugSchema.safeParse(slug ?? "");
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      "Invalid brand slug",
      parsed.error.flatten(),
    );
  }

  const brand = await prisma.brand.findFirst({
    where: { slug: parsed.data.toLowerCase(), isActive: true },
  });

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    },
  });
}
