import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { prisma, withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { brandCreateSchema } from "@/lib/validators/brand";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const brand = await withBrand(auth.brandId, (tx) =>
    tx.brand.findUnique({
      where: { id: auth.brandId },
    }),
  );

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  return NextResponse.json({ ok: true, data: brand });
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

  const parsed = brandCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const slug = parsed.data.slug.trim().toLowerCase();

  try {
    const brand = await prisma.$transaction(async (tx) => {
      const existing = await tx.brand.findUnique({ where: { slug } });
      if (existing) {
        return null;
      }

      const created = await tx.brand.create({
        data: {
          name: parsed.data.name.trim(),
          slug,
          logoUrl: parsed.data.logoUrl,
        },
      });

      await tx.user.update({
        where: { id: auth.userId },
        data: { brandId: created.id },
      });

      return created;
    });

    if (!brand) {
      return jsonError(409, "brand_slug_taken", "Brand slug already exists");
    }

    return NextResponse.json(
      { ok: true, data: brand, meta: { requiresReauth: true } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "brand_slug_taken", "Brand slug already exists");
    }
    return jsonError(500, "brand_create_failed", "Could not create brand");
  }
}
