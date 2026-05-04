import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { getDataQualitySummary } from "@/lib/data-quality/analysis";
import { withBrand } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return withBrand(auth.brandId, async (tx) => {
    const data = await getDataQualitySummary(tx, auth.brandId);
    return NextResponse.json({ ok: true, data });
  });
}
