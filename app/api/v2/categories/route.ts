import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

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

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  const parsedName = parseName(body.name);
  if (parsedName.error) {
    return { error: parsedName.error };
  }

  return { data: { name: parsedName.name } satisfies CreatePayload };
}

export async function GET(request: Request) {
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

  const where: Prisma.CategoryV2WhereInput = {
    brandId: auth.brandId,
  };

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  return withBrand(auth.brandId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.categoryV2.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.categoryV2.count({ where }),
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

  const parsed = parseCreatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  try {
    return await withBrand(auth.brandId, async (tx) => {
      const category = await tx.categoryV2.create({
        data: {
          brandId: auth.brandId,
          name: parsed.data.name,
        },
      });

      return NextResponse.json({ ok: true, data: category }, { status: 201 });
    });
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
