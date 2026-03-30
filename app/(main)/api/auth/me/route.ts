import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils/errors";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session.user.brandId || !session.user.role) {
    return jsonError(401, "unauthorized", "Not authenticated");
  }

  return NextResponse.json({
    userId: session.user.id,
    email: session.user.email ?? null,
    role: session.user.role,
    brandId: session.user.brandId,
  });
}
