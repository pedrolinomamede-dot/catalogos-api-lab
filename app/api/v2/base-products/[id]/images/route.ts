import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type CreateImagePayload = {
  imageUrl: string;
  sortOrder?: number;
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

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "brandId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  if (!hasOwn(body, "imageUrl") || typeof body.imageUrl !== "string") {
    return { error: jsonError(400, "validation_error", "imageUrl is required") };
  }

  const imageUrl = body.imageUrl.trim();
  if (!imageUrl) {
    return {
      error: jsonError(400, "validation_error", "imageUrl must be a non-empty string"),
    };
  }

  let sortOrder: number | undefined;
  if (hasOwn(body, "sortOrder")) {
    if (
      typeof body.sortOrder !== "number" ||
      !Number.isInteger(body.sortOrder) ||
      body.sortOrder < 0
    ) {
      return {
        error: jsonError(400, "validation_error", "sortOrder must be a non-negative integer"),
      };
    }
    sortOrder = body.sortOrder;
  }

  return { data: { imageUrl, sortOrder } satisfies CreateImagePayload };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

  try {
    return await withBrand(auth.brandId, async (tx) => {
      const productBase = await tx.productBaseV2.findFirst({
        where: { id, brandId: auth.brandId },
        select: { id: true },
      });

      if (!productBase) {
        return jsonError(404, "not_found", "Product not found");
      }

      const images = await tx.$queryRaw<
        Array<{
          id: string;
          brandId: string;
          productBaseId: string;
          imageUrl: string;
          sortOrder: number;
          createdAt: Date;
        }>
      >`
        SELECT
          "id",
          "brandId",
          "productBaseId",
          "imageUrl",
          "sortOrder",
          "createdAt"
        FROM "ProductBaseImageV2"
        WHERE
          "brandId" = ${auth.brandId}::uuid
          AND "productBaseId" = ${id}::uuid
        ORDER BY "sortOrder" ASC, "createdAt" ASC
      `;

      return NextResponse.json(images);
    });
  } catch (error) {
    console.error("[base-products/images][GET] failed", error);
    return jsonError(500, "base_product_images_list_failed", "Could not list product images");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;

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
      const productBase = await tx.productBaseV2.findFirst({
        where: { id, brandId: auth.brandId },
        select: { id: true, imageUrl: true },
      });

      if (!productBase) {
        return jsonError(404, "not_found", "Product not found");
      }

      const duplicatedImage = await tx.$queryRaw<
        Array<{ id: string }>
      >`
        SELECT "id"
        FROM "ProductBaseImageV2"
        WHERE
          "brandId" = ${auth.brandId}::uuid
          AND "productBaseId" = ${id}::uuid
          AND "imageUrl" = ${parsed.data.imageUrl}
        LIMIT 1
      `;

      if (duplicatedImage.length > 0) {
        return jsonError(409, "image_conflict", "A imagem ja existe na galeria deste produto");
      }

      const maxSortOrderResult = await tx.$queryRaw<
        Array<{ maxSortOrder: number | null }>
      >`
        SELECT MAX("sortOrder")::int AS "maxSortOrder"
        FROM "ProductBaseImageV2"
        WHERE
          "brandId" = ${auth.brandId}::uuid
          AND "productBaseId" = ${id}::uuid
      `;

      const maxSortOrder = maxSortOrderResult[0]?.maxSortOrder ?? null;
      const newSortOrder = parsed.data.sortOrder ?? (maxSortOrder ?? 0) + 1;

      const insertedImages = await tx.$queryRaw<
        Array<{
          id: string;
          brandId: string;
          productBaseId: string;
          imageUrl: string;
          sortOrder: number;
          createdAt: Date;
        }>
      >`
        INSERT INTO "ProductBaseImageV2" (
          "id",
          "brandId",
          "productBaseId",
          "imageUrl",
          "sortOrder",
          "createdAt"
        )
        VALUES (
          gen_random_uuid(),
          ${auth.brandId}::uuid,
          ${id}::uuid,
          ${parsed.data.imageUrl},
          ${newSortOrder},
          NOW()
        )
        RETURNING
          "id",
          "brandId",
          "productBaseId",
          "imageUrl",
          "sortOrder",
          "createdAt"
      `;

      const image = insertedImages[0];
      if (!image) {
        return jsonError(500, "base_product_image_create_failed", "Could not add image to gallery");
      }

      if (!productBase.imageUrl) {
        await tx.productBaseV2.update({
          where: { id: productBase.id },
          data: { imageUrl: image.imageUrl },
        });
      }

      return NextResponse.json(image, { status: 201 });
    });
  } catch (error) {
    console.error("[base-products/images][POST] failed", error);
    return jsonError(500, "base_product_image_create_failed", "Could not add image to gallery");
  }
}
