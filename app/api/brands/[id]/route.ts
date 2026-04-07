import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { prisma, withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { brandUpdateSchema } from "@/lib/validators/brand";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (id !== auth.brandId) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  const brand = await withBrand(auth.brandId, (tx) =>
    tx.brand.findUnique({
      where: { id },
    }),
  );

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  return NextResponse.json({ ok: true, data: brand });
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

  if (id !== auth.brandId) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = brandUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const slug = parsed.data.slug?.trim().toLowerCase();

  try {
    const brand = await prisma.$transaction(async (tx) => {
      if (slug) {
        const existing = await tx.brand.findUnique({ where: { slug } });
        if (existing && existing.id !== id) {
          return null;
        }
      }

      return tx.brand.update({
        where: { id },
        data: {
          name: parsed.data.name?.trim(),
          slug,
          logoUrl: parsed.data.logoUrl,
          isActive: parsed.data.isActive,
        },
      });
    });

    if (!brand) {
      return jsonError(409, "brand_slug_taken", "Brand slug already exists");
    }

    return NextResponse.json({ ok: true, data: brand });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "brand_slug_taken", "Brand slug already exists");
    }
    return jsonError(500, "brand_update_failed", "Could not update brand");
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

  if (id !== auth.brandId) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  const brand = await withBrand(auth.brandId, (tx) =>
    tx.brand.findUnique({ where: { id } }),
  );

  if (!brand) {
    return jsonError(404, "not_found", "Brand not found");
  }

  await prisma.brand.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
