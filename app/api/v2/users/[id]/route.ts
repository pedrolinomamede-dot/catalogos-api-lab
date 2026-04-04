import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

const SALT_ROUNDS = 12;
const ALLOWED_UPDATE_ROLES = new Set<UserRole>(["ADMIN", "SELLER"]);

type UpdatePayload = {
  name?: string | null;
  email?: string;
  password?: string;
  role?: UserRole;
  whatsappPhone?: string | null;
  isActive?: boolean;
};

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

function parseRole(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  return ALLOWED_UPDATE_ROLES.has(value as UserRole) ? (value as UserRole) : null;
}

function parseUpdatePayload(body: unknown) {
  if (!isPlainObject(body)) {
    return { error: jsonError(400, "validation_error", "Invalid payload") };
  }

  const data: UpdatePayload = {};

  if ("name" in body) {
    data.name = normalizeOptionalNullableString(body.name);
  }

  if ("email" in body) {
    const email = parseEmail(body.email);
    if (!email) {
      return { error: jsonError(400, "validation_error", "Valid email is required") };
    }
    data.email = email;
  }

  if ("password" in body) {
    if (typeof body.password !== "string") {
      return { error: jsonError(400, "validation_error", "Invalid password") };
    }
    const password = body.password.trim();
    if (password.length > 0 && password.length < 8) {
      return {
        error: jsonError(400, "validation_error", "Password must be at least 8 characters"),
      };
    }
    if (password.length > 0) {
      data.password = password;
    }
  }

  if ("role" in body) {
    const role = parseRole(body.role);
    if (!role) {
      return { error: jsonError(400, "validation_error", "Invalid role") };
    }
    data.role = role;
  }

  if ("whatsappPhone" in body) {
    data.whatsappPhone = normalizeOptionalNullableString(body.whatsappPhone) ?? null;
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      return { error: jsonError(400, "validation_error", "Invalid status") };
    }
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) {
    return { error: jsonError(400, "validation_error", "No changes provided") };
  }

  return { data };
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

  return withBrand(auth.brandId, async (tx) => {
    const existing = await tx.user.findFirst({
      where: {
        id,
        brandId: auth.brandId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!existing) {
      return jsonError(404, "not_found", "User not found");
    }

    if (
      existing.id === auth.userId &&
      (parsed.data.isActive === false || parsed.data.role === "SELLER")
    ) {
      return jsonError(400, "validation_error", "You cannot deactivate or demote your own user");
    }

    try {
      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
          ...(parsed.data.role ? { role: parsed.data.role } : {}),
          ...(parsed.data.whatsappPhone !== undefined
            ? { whatsappPhone: parsed.data.whatsappPhone }
            : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.password
            ? { passwordHash: await bcrypt.hash(parsed.data.password, SALT_ROUNDS) }
            : {}),
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

      return NextResponse.json({
        ok: true,
        data: serializeUser(updated),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError(409, "email_taken", "Email already exists");
      }
      return jsonError(500, "user_update_failed", "Could not update user");
    }
  });
}
