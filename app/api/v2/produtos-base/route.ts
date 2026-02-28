import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

const SKU_REGEX = /^\d{4}$/;

type CreatePayload = {
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  barcode?: string;
  size?: string;
  isActive?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId")) {
    return { error: jsonError(400, "validation_error", "brandId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  const rawSku = body.sku;
  if (typeof rawSku !== "string") {
    return { error: jsonError(400, "validation_error", "SKU is required") };
  }

  const sku = rawSku.trim();
  if (!SKU_REGEX.test(sku)) {
    return {
      error: jsonError(400, "validation_error", "SKU must have exactly 4 digits"),
    };
  }

  const rawName = body.name;
  if (typeof rawName !== "string") {
    return { error: jsonError(400, "validation_error", "Name is required") };
  }

  const name = rawName.trim();
  if (name.length < 2) {
    return {
      error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
    };
  }

  if (name.startsWith("#")) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "Name starting with # is not allowed",
      ),
    };
  }

  let description: string | undefined;
  if (hasOwn(body, "description")) {
    if (typeof body.description !== "string") {
      return {
        error: jsonError(400, "validation_error", "Description must be a string"),
      };
    }
    description = body.description;
  }

  let brand: string | undefined;
  if (hasOwn(body, "brand")) {
    if (typeof body.brand !== "string") {
      return {
        error: jsonError(400, "validation_error", "brand must be a string"),
      };
    }
    const value = body.brand.trim();
    brand = value.length > 0 ? value : undefined;
  }

  let barcode: string | undefined;
  if (hasOwn(body, "barcode")) {
    if (typeof body.barcode !== "string") {
      return {
        error: jsonError(400, "validation_error", "barcode must be a string"),
      };
    }
    const value = body.barcode.trim();
    barcode = value.length > 0 ? value : undefined;
  }

  let size: string | undefined;
  if (hasOwn(body, "size")) {
    if (typeof body.size !== "string") {
      return {
        error: jsonError(400, "validation_error", "size must be a string"),
      };
    }
    const value = body.size.trim();
    size = value.length > 0 ? value : undefined;
  }

  let isActive: boolean | undefined;
  if (hasOwn(body, "isActive")) {
    if (typeof body.isActive !== "boolean") {
      return {
        error: jsonError(400, "validation_error", "isActive must be a boolean"),
      };
    }
    isActive = body.isActive;
  }

  return {
    data: {
      sku,
      name,
      description,
      brand,
      barcode,
      size,
      isActive,
    } satisfies CreatePayload,
  };
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

  const where: Prisma.ProductBaseV2WhereInput = {
    brandId: auth.brandId,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { size: { contains: q, mode: "insensitive" } },
    ];
  }

  return withBrand(auth.brandId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.productBaseV2.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.productBaseV2.count({ where }),
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
      const baseProduct = await tx.productBaseV2.create({
        data: {
          brandId: auth.brandId,
          sku: parsed.data.sku,
          name: parsed.data.name,
          description: parsed.data.description,
          brand: parsed.data.brand,
          barcode: parsed.data.barcode,
          size: parsed.data.size,
          isActive: parsed.data.isActive,
          sourceType: "MANUAL",
        },
      });

      return NextResponse.json({ ok: true, data: baseProduct }, { status: 201 });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "base_product_conflict", "SKU already exists");
    }
    return jsonError(500, "base_product_create_failed", "Could not create base product");
  }
}
