import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { createOrRefreshCatalogItemSnapshot } from "@/lib/catalog-snapshots/create-catalog-item-snapshot";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CreatePayload = {
  productBaseId: string;
  sortOrder?: number | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (hasOwn(body, "id") || hasOwn(body, "catalogId")) {
    return { error: jsonError(400, "validation_error", "catalogId is not allowed") };
  }

  if (!hasOwn(body, "productBaseId") || typeof body.productBaseId !== "string") {
    return {
      error: jsonError(400, "validation_error", "productBaseId is required"),
    };
  }

  const productBaseId = body.productBaseId.trim();
  if (!isUuid(productBaseId)) {
    return {
      error: jsonError(400, "validation_error", "productBaseId must be a UUID"),
    };
  }

  let sortOrder: number | null | undefined;
  if (hasOwn(body, "sortOrder")) {
    if (body.sortOrder === null) {
      sortOrder = null;
    } else if (typeof body.sortOrder === "number" && Number.isInteger(body.sortOrder)) {
      sortOrder = body.sortOrder;
    } else {
      return { error: jsonError(400, "validation_error", "sortOrder must be an integer") };
    }
  }

  return { data: { productBaseId, sortOrder } satisfies CreatePayload };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const catalog = await tx.catalogV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    });

    if (!catalog) {
      return jsonError(404, "not_found", "Catalog not found");
    }

    const items = await tx.catalogItemV2.findMany({
      where: {
        catalogId: catalog.id,
        brandId: auth.brandId,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        catalogId: true,
        productBaseId: true,
        sortOrder: true,
        createdAt: true,
        productBase: {
          select: {
            id: true,
            name: true,
            sku: true,
            sourceType: true,
            sourceProvider: true,
          },
        },
        snapshot: {
          select: {
            id: true,
            catalogItemId: true,
            snapshotVersion: true,
            sourceType: true,
            sourceProvider: true,
            sourceExternalId: true,
            sourceExternalCode: true,
            name: true,
            code: true,
            barcode: true,
            brand: true,
            description: true,
            categoryId: true,
            categoryName: true,
            subcategoryId: true,
            subcategoryName: true,
            price: true,
            primaryImageUrl: true,
            galleryJson: true,
            attributesJson: true,
            capturedAt: true,
            refreshedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, data: items });
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
      const catalog = await tx.catalogV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });

      if (!catalog) {
        return jsonError(404, "not_found", "Catalog not found");
      }

      const productBase = await tx.productBaseV2.findFirst({
        where: {
          id: parsed.data.productBaseId,
          brandId: auth.brandId,
        },
      });

      if (!productBase) {
        return jsonError(404, "not_found", "Base product not found");
      }

      const existing = await tx.catalogItemV2.findFirst({
        where: {
          catalogId: catalog.id,
          productBaseId: productBase.id,
          brandId: auth.brandId,
        },
      });

      if (existing) {
        return jsonError(409, "catalog_item_conflict", "Catalog item already exists");
      }

      const item = await tx.catalogItemV2.create({
        data: {
          brandId: auth.brandId,
          catalogId: catalog.id,
          productBaseId: productBase.id,
          sortOrder: parsed.data.sortOrder ?? null,
        },
        select: {
          id: true,
          brandId: true,
          catalogId: true,
          productBaseId: true,
          sortOrder: true,
          createdAt: true,
          productBase: {
            select: {
              id: true,
              name: true,
              sku: true,
              sourceType: true,
              sourceProvider: true,
            },
          },
        },
      });

      const snapshot = await createOrRefreshCatalogItemSnapshot(tx, {
        brandId: auth.brandId,
        catalogItemId: item.id,
        productBaseId: productBase.id,
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            ...item,
            snapshot,
          },
        },
        { status: 201 },
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "catalog_item_conflict", "Catalog item already exists");
    }
    return jsonError(500, "catalog_item_create_failed", "Could not add catalog item");
  }
}
