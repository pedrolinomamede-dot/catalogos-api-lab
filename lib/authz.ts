import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminRole } from "@/lib/roles";
import { getBrandScope } from "@/lib/tenant";
import { jsonError } from "@/lib/utils/errors";

export type AuthContext = {
  userId: string;
  brandId: string;
  role: UserRole;
};

export async function requireUser(): Promise<AuthContext | NextResponse> {
  const session = await getAuthSession();
  const brandId = getBrandScope(session);

  if (!session?.user?.id || !brandId || !session.user.role) {
    return jsonError(401, "unauthorized", "Not authenticated");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      brandId,
    },
    select: {
      id: true,
      brandId: true,
      role: true,
      isActive: true,
      brand: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.isActive || !user.brand.isActive) {
    return jsonError(401, "unauthorized", "Not authenticated");
  }

  return {
    userId: user.id,
    brandId: user.brandId,
    role: user.role,
  };
}

export async function requireRole(
  role: UserRole,
): Promise<AuthContext | NextResponse> {
  return requireRoles([role]);
}

export async function requireRoles(
  roles: UserRole[],
): Promise<AuthContext | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }

  if (!roles.includes(user.role) && !isSuperAdminRole(user.role)) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  return user;
}

export async function requirePlatformAdmin(): Promise<AuthContext | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }

  if (!isSuperAdminRole(user.role)) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  return user;
}
