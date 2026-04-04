import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const SALT_ROUNDS = 12;
const ALLOWED_CREATE_ROLES = new Set<UserRole>(["ADMIN", "SELLER"]);

type CreatePayload = {
  name?: string;
  email: string;
  password: string;
  role: UserRole;
  whatsappPhone?: string | null;
  isActive: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function parseRole(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  return ALLOWED_CREATE_ROLES.has(value as UserRole) ? (value as UserRole) : null;
}

function parseCreatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const email = parseEmail(body.email);
  if (!email) {
    return { error: jsonError(400, "validation_error", "Valid email is required") };
  }

  const password = typeof body.password === "string" ? body.password.trim() : "";
  if (password.length < 8) {
    return {
      error: jsonError(400, "validation_error", "Password must be at least 8 characters"),
    };
  }

  const role = parseRole(body.role);
  if (!role) {
    return { error: jsonError(400, "validation_error", "Invalid role") };
  }

  const name = normalizeOptionalString(body.name);
  const whatsappPhone = normalizeOptionalNullableString(body.whatsappPhone) ?? null;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  return {
    data: {
      name,
      email,
      password,
      role,
      whatsappPhone,
      isActive,
    } satisfies CreatePayload,
  };
}

function serializeUser(user: {
  id: string;
  brandId: string;
  name: string | null;
  email: string;
  role: UserRole;
  whatsappPhone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    brandId: user.brandId,
    name: user.name,
    email: user.email,
    role: user.role,
    whatsappPhone: user.whatsappPhone,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const users = await tx.user.findMany({
      where: { brandId: auth.brandId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        brandId: true,
        name: true,
        email: true,
        role: true,
        whatsappPhone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: users.map(serializeUser),
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
    const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);

    return await withBrand(auth.brandId, async (tx) => {
      const created = await tx.user.create({
        data: {
          brandId: auth.brandId,
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: parsed.data.role,
          whatsappPhone: parsed.data.whatsappPhone,
          isActive: parsed.data.isActive,
        },
        select: {
          id: true,
          brandId: true,
          name: true,
          email: true,
          role: true,
          whatsappPhone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          data: serializeUser(created),
        },
        { status: 201 },
      );
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "email_taken", "Email already exists");
    }
    return jsonError(500, "user_create_failed", "Could not create user");
  }
}
