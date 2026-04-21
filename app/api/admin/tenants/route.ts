import bcrypt from "bcryptjs";
import { Prisma, type Brand } from "@prisma/client";
import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { normalizeCnpj } from "@/lib/utils/cnpj";
import { jsonError } from "@/lib/utils/errors";

const SALT_ROUNDS = 12;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function parseOptionalCnpj(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { value: null };
  }

  if (typeof value !== "string") {
    return { error: "brandCnpj must be a string" };
  }

  const cnpj = normalizeCnpj(value);
  if (!cnpj) {
    return { value: null };
  }

  if (cnpj.length !== 14) {
    return { error: "brandCnpj must have 14 digits" };
  }

  return { value: cnpj };
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const brandName =
    typeof body.brandName === "string" ? body.brandName.trim() : "";
  const brandSlug =
    typeof body.brandSlug === "string" ? body.brandSlug.trim().toLowerCase() : "";
  const adminEmail = parseEmail(body.adminEmail);
  const adminPassword =
    typeof body.adminPassword === "string" ? body.adminPassword.trim() : "";
  const brandCnpj = parseOptionalCnpj(body.brandCnpj);

  if (brandName.length < 3) {
    return { error: jsonError(400, "validation_error", "brandName is required") };
  }

  if (!/^[a-z0-9-]+$/i.test(brandSlug)) {
    return { error: jsonError(400, "validation_error", "brandSlug is invalid") };
  }

  if (!adminEmail) {
    return { error: jsonError(400, "validation_error", "adminEmail must be valid") };
  }

  if (adminPassword.length < 8) {
    return {
      error: jsonError(400, "validation_error", "adminPassword must be at least 8 characters"),
    };
  }

  if (brandCnpj.error) {
    return { error: jsonError(400, "validation_error", brandCnpj.error) };
  }

  return {
    data: {
      brandName,
      brandSlug,
      brandCnpj: brandCnpj.value,
      logoUrl: normalizeOptionalNullableString(body.logoUrl) ?? null,
      adminName: normalizeOptionalNullableString(body.adminName) ?? null,
      adminEmail,
      adminPassword,
      adminWhatsappPhone:
        normalizeOptionalNullableString(body.adminWhatsappPhone) ?? null,
    },
  };
}

async function serializeTenant(tenant: Brand) {
  const [usersCount, shareLinksCount, orderIntentsCount, productRequestsCount] =
    await Promise.all([
      prisma.user.count({ where: { brandId: tenant.id } }),
      prisma.shareLinkV2.count({ where: { brandId: tenant.id } }),
      prisma.orderIntent.count({ where: { brandId: tenant.id } }),
      prisma.productRequest.count({ where: { brandId: tenant.id } }),
    ]);

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
    cnpj: tenant.cnpj,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    usersCount,
    shareLinksCount,
    orderIntentsCount,
    productRequestsCount,
  };
}

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const tenants = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    data: await Promise.all(tenants.map((tenant) => serializeTenant(tenant))),
  });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
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
    const passwordHash = await bcrypt.hash(parsed.data.adminPassword, SALT_ROUNDS);

    const created = await prisma.$transaction(async (tx) => {
      const existingBrand = await tx.brand.findUnique({
        where: { slug: parsed.data.brandSlug },
      });

      if (existingBrand) {
        return null;
      }

      const existingUser = await tx.user.findUnique({
        where: { email: parsed.data.adminEmail },
      });

      if (existingUser) {
        throw new Error("EMAIL_TAKEN");
      }

      const brand = await tx.brand.create({
        data: {
          name: parsed.data.brandName,
          slug: parsed.data.brandSlug,
          cnpj: parsed.data.brandCnpj,
          logoUrl: parsed.data.logoUrl,
          isActive: true,
        },
      });

      await tx.user.create({
        data: {
          brandId: brand.id,
          name: parsed.data.adminName,
          email: parsed.data.adminEmail,
          passwordHash,
          role: "ADMIN",
          whatsappPhone: parsed.data.adminWhatsappPhone,
          isActive: true,
        },
      });

      return tx.brand.findUniqueOrThrow({
        where: { id: brand.id },
      });
    });

    if (!created) {
      return jsonError(409, "brand_slug_taken", "Brand slug already exists");
    }

    return NextResponse.json(
      { ok: true, data: await serializeTenant(created) },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");
      if (target.includes("cnpj")) {
        return jsonError(409, "brand_cnpj_taken", "Brand CNPJ already exists");
      }

      return jsonError(409, "email_taken", "Admin email already exists");
    }

    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return jsonError(409, "email_taken", "Admin email already exists");
    }

    return jsonError(500, "tenant_create_failed", "Could not create tenant");
  }
}
