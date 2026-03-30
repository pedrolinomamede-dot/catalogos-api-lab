import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole, requireUser } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

type CreatePayload = {
  name: string;
  description?: string | null;
  pdfHeaderLeftLogoUrl?: string | null;
  pdfHeaderRightLogoUrl?: string | null;
  pdfStripeBgColor?: string | null;
  pdfStripeLineColor?: string | null;
  pdfStripeTextColor?: string | null;
  pdfStripeFontFamily?: string | null;
  pdfStripeFontWeight?: number | null;
  pdfStripeFontSize?: number | null;
};

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;
const PDF_FONT_FAMILIES = new Set(["MANROPE", "PLAYFAIR", "POPPINS"]);
const PDF_FONT_WEIGHTS = new Set([400, 500, 600, 700]);
const PDF_FONT_SIZE_MIN = 12;
const PDF_FONT_SIZE_MAX = 36;

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

function parseOptionalLogoUrl(value: unknown, fieldName: string) {
  if (value === null) {
    return { value: null as string | null };
  }

  if (typeof value !== "string") {
    return {
      error: jsonError(
        400,
        "validation_error",
        `${fieldName} must be a string or null`,
      ),
    };
  }

  const normalized = value.trim();
  if (!normalized) {
    return {
      error: jsonError(
        400,
        "validation_error",
        `${fieldName} must be a non-empty string or null`,
      ),
    };
  }

  return { value: normalized };
}

function parseOptionalHexColor(value: unknown, fieldName: string) {
  if (value === null) {
    return { value: null as string | null };
  }

  if (typeof value !== "string") {
    return {
      error: jsonError(
        400,
        "validation_error",
        `${fieldName} must be a string or null`,
      ),
    };
  }

  const normalized = value.trim();
  if (!HEX_COLOR_REGEX.test(normalized)) {
    return {
      error: jsonError(
        400,
        "validation_error",
        `${fieldName} must be in hex format (#RRGGBB)`,
      ),
    };
  }

  return { value: normalized.toUpperCase() };
}

function parseOptionalFontFamily(value: unknown) {
  if (value === null) {
    return { value: null as string | null };
  }

  if (typeof value !== "string") {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfStripeFontFamily must be a string or null",
      ),
    };
  }

  const normalized = value.trim().toUpperCase();
  if (!PDF_FONT_FAMILIES.has(normalized)) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfStripeFontFamily must be one of: MANROPE, PLAYFAIR, POPPINS",
      ),
    };
  }

  return { value: normalized };
}

function parseOptionalFontWeight(value: unknown) {
  if (value === null) {
    return { value: null as number | null };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfStripeFontWeight must be an integer or null",
      ),
    };
  }

  if (!PDF_FONT_WEIGHTS.has(value)) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfStripeFontWeight must be one of: 400, 500, 600, 700",
      ),
    };
  }

  return { value };
}

function parseOptionalFontSize(value: unknown) {
  if (value === null) {
    return { value: null as number | null };
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return {
      error: jsonError(
        400,
        "validation_error",
        "pdfStripeFontSize must be an integer or null",
      ),
    };
  }

  if (value < PDF_FONT_SIZE_MIN || value > PDF_FONT_SIZE_MAX) {
    return {
      error: jsonError(
        400,
        "validation_error",
        `pdfStripeFontSize must be between ${PDF_FONT_SIZE_MIN} and ${PDF_FONT_SIZE_MAX}`,
      ),
    };
  }

  return { value };
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

  let description: string | null | undefined;
  if (hasOwn(body, "description")) {
    const parsedDescription = parseDescription(body.description);
    if (parsedDescription.error) {
      return { error: parsedDescription.error };
    }
    description = parsedDescription.description;
  }

  let pdfHeaderLeftLogoUrl: string | null | undefined;
  if (hasOwn(body, "pdfHeaderLeftLogoUrl")) {
    const parsed = parseOptionalLogoUrl(body.pdfHeaderLeftLogoUrl, "pdfHeaderLeftLogoUrl");
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfHeaderLeftLogoUrl = parsed.value;
  }

  let pdfHeaderRightLogoUrl: string | null | undefined;
  if (hasOwn(body, "pdfHeaderRightLogoUrl")) {
    const parsed = parseOptionalLogoUrl(body.pdfHeaderRightLogoUrl, "pdfHeaderRightLogoUrl");
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfHeaderRightLogoUrl = parsed.value;
  }

  let pdfStripeBgColor: string | null | undefined;
  if (hasOwn(body, "pdfStripeBgColor")) {
    const parsed = parseOptionalHexColor(body.pdfStripeBgColor, "pdfStripeBgColor");
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeBgColor = parsed.value;
  }

  let pdfStripeLineColor: string | null | undefined;
  if (hasOwn(body, "pdfStripeLineColor")) {
    const parsed = parseOptionalHexColor(body.pdfStripeLineColor, "pdfStripeLineColor");
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeLineColor = parsed.value;
  }

  let pdfStripeTextColor: string | null | undefined;
  if (hasOwn(body, "pdfStripeTextColor")) {
    const parsed = parseOptionalHexColor(body.pdfStripeTextColor, "pdfStripeTextColor");
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeTextColor = parsed.value;
  }

  let pdfStripeFontFamily: string | null | undefined;
  if (hasOwn(body, "pdfStripeFontFamily")) {
    const parsed = parseOptionalFontFamily(body.pdfStripeFontFamily);
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeFontFamily = parsed.value;
  }

  let pdfStripeFontWeight: number | null | undefined;
  if (hasOwn(body, "pdfStripeFontWeight")) {
    const parsed = parseOptionalFontWeight(body.pdfStripeFontWeight);
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeFontWeight = parsed.value;
  }

  let pdfStripeFontSize: number | null | undefined;
  if (hasOwn(body, "pdfStripeFontSize")) {
    const parsed = parseOptionalFontSize(body.pdfStripeFontSize);
    if (parsed.error) {
      return { error: parsed.error };
    }
    pdfStripeFontSize = parsed.value;
  }

  return {
    data: {
      name: parsedName.name,
      description,
      pdfHeaderLeftLogoUrl,
      pdfHeaderRightLogoUrl,
      pdfStripeBgColor,
      pdfStripeLineColor,
      pdfStripeTextColor,
      pdfStripeFontFamily,
      pdfStripeFontWeight,
      pdfStripeFontSize,
    } satisfies CreatePayload,
  };
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const { take, skip, page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 50,
    maxPageSize: 100,
  });

  const where: Prisma.CatalogV2WhereInput = {
    brandId: auth.brandId,
  };

  return withBrand(auth.brandId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.catalogV2.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      tx.catalogV2.count({ where }),
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
      const catalog = await tx.catalogV2.create({
        data: {
          brandId: auth.brandId,
          name: parsed.data.name,
          description: parsed.data.description,
          pdfHeaderLeftLogoUrl: parsed.data.pdfHeaderLeftLogoUrl,
          pdfHeaderRightLogoUrl: parsed.data.pdfHeaderRightLogoUrl,
          pdfStripeBgColor: parsed.data.pdfStripeBgColor,
          pdfStripeLineColor: parsed.data.pdfStripeLineColor,
          pdfStripeTextColor: parsed.data.pdfStripeTextColor,
          pdfStripeFontFamily: parsed.data.pdfStripeFontFamily,
          pdfStripeFontWeight: parsed.data.pdfStripeFontWeight,
          pdfStripeFontSize: parsed.data.pdfStripeFontSize,
        },
      });

      return NextResponse.json({ ok: true, data: catalog }, { status: 201 });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "catalog_conflict", "Catalog already exists");
    }
    return jsonError(500, "catalog_create_failed", "Could not create catalog");
  }
}
