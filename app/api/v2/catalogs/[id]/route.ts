import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { isPrismaMissingColumnError } from "@/lib/prisma/errors";
import { jsonError } from "@/lib/utils/errors";

type UpdatePayload = {
  name?: string;
  description?: string | null;
  pdfBackgroundImageUrl?: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function parseName(value: unknown) {
  if (typeof value !== "string") {
    return { error: jsonError(400, "validation_error", "Name must be a string") };
  }

  const name = value.trim();
  if (name.length < 2) {
    return {
      error: jsonError(400, "validation_error", "Name must be at least 2 characters"),
    };
  }

  return { name };
}

function parseDescription(value: unknown) {
  if (value === null) {
    return { description: null };
  }

  if (typeof value !== "string") {
    return { error: jsonError(400, "validation_error", "Description must be a string") };
  }

  const description = value.trim();
  if (description.length === 0) {
    return { description: null };
  }

  return { description };
}

function parsePdfBackgroundImageUrl(value: unknown) {
  if (value === null) {
    return { pdfBackgroundImageUrl: null };
  }

  if (typeof value !== "string") {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfBackgroundImageUrl must be a string or null",
      ),
    };
  }

  const normalized = value.trim();
  if (!normalized) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfBackgroundImageUrl must be a non-empty string or null",
      ),
    };
  }

  return { pdfBackgroundImageUrl: normalized };
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  if (hasOwn(body, "brandId") || hasOwn(body, "tenantId")) {
    return { error: jsonError(400, "validation_error", "tenantId is not allowed") };
  }

  if (hasOwn(body, "id")) {
    return { error: jsonError(400, "validation_error", "id is not allowed") };
  }

  const data: UpdatePayload = {};

  if (hasOwn(body, "name")) {
    const parsedName = parseName(body.name);
    if (parsedName.error) {
      return { error: parsedName.error };
    }
    data.name = parsedName.name;
  }

  if (hasOwn(body, "description")) {
    const parsedDescription = parseDescription(body.description);
    if (parsedDescription.error) {
      return { error: parsedDescription.error };
    }
    data.description = parsedDescription.description;
  }

  if (hasOwn(body, "pdfBackgroundImageUrl")) {
    const parsedBackground = parsePdfBackgroundImageUrl(body.pdfBackgroundImageUrl);
    if (parsedBackground.error) {
      return { error: parsedBackground.error };
    }
    data.pdfBackgroundImageUrl = parsedBackground.pdfBackgroundImageUrl;
  }

  if (Object.keys(data).length === 0) {
    return {
      error: jsonError(400, "validation_error", "At least one field is required"),
    };
  }

  return { data };
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

  const catalog = await withBrand(auth.brandId, (tx) =>
    tx.catalogV2.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
    }),
  );

  if (!catalog) {
    return jsonError(404, "not_found", "Catalog not found");
  }

  return NextResponse.json({ ok: true, data: catalog });
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = parseUpdatePayload(body);
  if (parsed.error) {
    return parsed.error;
  }

  try {
    const updated = await withBrand(auth.brandId, async (tx) => {
      const result = await tx.catalogV2.updateMany({
        where: {
          id,
          brandId: auth.brandId,
        },
        data: parsed.data,
      });

      if (result.count === 0) {
        return null;
      }

      return tx.catalogV2.findFirst({
        where: {
          id,
          brandId: auth.brandId,
        },
      });
    });

    if (!updated) {
      return jsonError(404, "not_found", "Catalog not found");
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    if (isPrismaMissingColumnError(error)) {
      return jsonError(
        503,
        "schema_migration_required",
        "Banco desatualizado: aplique as migrations pendentes.",
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "catalog_conflict", "Catalog already exists");
    }
    return jsonError(500, "catalog_update_failed", "Could not update catalog");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const dryRunParam = request.nextUrl.searchParams.get("dryRun");
  const isDryRun = dryRunParam === "1" || dryRunParam === "true";

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

    const [itemCount, shareLinkCount] = await Promise.all([
      tx.catalogItemV2.count({
        where: {
          catalogId: catalog.id,
          brandId: auth.brandId,
        },
      }),
      tx.shareLinkCatalogV2.count({
        where: {
          catalogId: catalog.id,
          brandId: auth.brandId,
        },
      }),
    ]);

    if (isDryRun) {
      return NextResponse.json({
        ok: true,
        data: {
          itemsCount: itemCount,
          shareLinksCount: shareLinkCount,
        },
      });
    }

    await tx.catalogV2.deleteMany({
      where: {
        id: catalog.id,
        brandId: auth.brandId,
      },
    });

    return NextResponse.json({ ok: true });
  });
}
