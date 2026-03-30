import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { handleImageUpload } from "@/lib/uploads/image-upload";

export async function POST(request: Request) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  return handleImageUpload(request, auth.brandId);
}
