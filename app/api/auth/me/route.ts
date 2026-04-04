import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.brandId || !session.user.role) {
    return jsonError(401, "unauthorized", "Not authenticated");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      brandId: session.user.brandId,
    },
    select: {
      id: true,
      brandId: true,
      name: true,
      email: true,
      role: true,
      whatsappPhone: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return jsonError(401, "unauthorized", "Not authenticated");
  }

  return NextResponse.json({
    userId: user.id,
    brandId: user.brandId,
    name: user.name,
    email: user.email,
    role: user.role,
    whatsappPhone: user.whatsappPhone,
    isActive: user.isActive,
  });
}
