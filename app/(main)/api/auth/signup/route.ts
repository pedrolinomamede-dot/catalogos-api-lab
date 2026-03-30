import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { signupSchema } from "@/lib/validators/auth";

const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation_error", "Invalid input", parsed.error.flatten());
  }

  const { brandName, brandSlug, email, password, name } = parsed.data;
  const slug = brandSlug.trim().toLowerCase();

  const [existingBrand, existingUser] = await Promise.all([
    prisma.brand.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email } }),
  ]);

  if (existingBrand) {
    return jsonError(409, "brand_slug_taken", "Brand slug already exists");
  }

  if (existingUser) {
    return jsonError(409, "email_taken", "Email already exists");
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          name: brandName,
          slug,
        },
      });

      await tx.user.create({
        data: {
          brandId: brand.id,
          email,
          name,
          passwordHash,
          role: "ADMIN",
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError(409, "conflict", "Email or brand slug already exists");
    }
    return jsonError(500, "signup_failed", "Could not create account");
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
