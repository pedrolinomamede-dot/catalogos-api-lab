import { NextResponse } from "next/server";

import { requireUser } from "@/lib/authz";
import { listIntegrationProviders } from "@/lib/integrations/core/providers";

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) {
    return auth;
  }

  return NextResponse.json({
    ok: true,
    data: listIntegrationProviders(),
  });
}
