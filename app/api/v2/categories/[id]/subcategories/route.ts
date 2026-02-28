import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

type CreatePayload = {
  name: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    return { error: jsonError(400, "validation_error", "Name is required") };
  }

  const name = value.trim();
  if (name.length < 2) {
    return {
      error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
    };
  }

  return { name };
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (hasOwn(body, "id") || hasOwn(body, "categoryId")) {
    return { error: jsonError(400, "validation_error", "categoryId is not allowed") };
  }

  const parsedName = parseName(body.name);
  if (parsedName.error) {
    return { error: parsedName.error };
  }

  return { data: { name: parsedName.name } satisfies CreatePayload };
}

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
  const q = searchParams.get("q")?.trim();
  const { take, skip, page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 50,
    maxPageSize: 100,
  });

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

    const where: Prisma.SubcategoryV2WhereInput = {
      brandId: auth.brandId,
      categoryId: category.id,
    };

    if (q) {
      where.name = { contains: q, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      tx.subcategoryV2.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.subcategoryV2.count({ where }),
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

export async function POST(
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

  const parsed = parseCreatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  try {
    return await withBrand(auth.brandId, async (tx) => {
      const category = await tx.categoryV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });

      if (!category) {
        return jsonError(404, "not_found", "Category not found");
      }

      const subcategory = await tx.subcategoryV2.create({
        data: {
          brandId: auth.brandId,
          categoryId: category.id,
          name: parsed.data.name,
        },
      });

      return NextResponse.json({ ok: true, data: subcategory }, { status: 201 });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "subcategory_conflict", "Subcategory already exists");
    }
    return jsonError(500, "subcategory_create_failed", "Could not create subcategory");
  }
}
