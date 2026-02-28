import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
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

  return {
    userId: session.user.id,
    brandId,
    role: session.user.role,
  };
}

export async function requireRole(
  role: UserRole,
): Promise<AuthContext | NextResponse> {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }

  if (user.role !== role) {
    return jsonError(403, "forbidden", "Not authorized");
  }

  return user;
}
