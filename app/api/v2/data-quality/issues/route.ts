import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  DATA_QUALITY_ISSUE_TYPES,
  listDataQualityIssues,
  type DataQualityIssueType,
} from "@/lib/data-quality/analysis";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";
import { parsePagination } from "@/lib/utils/pagination";

function isIssueType(value: string | null): value is DataQualityIssueType {
  if (!value) {
    return false;
  }

  return (DATA_QUALITY_ISSUE_TYPES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!isIssueType(type)) {
    return jsonError(400, "validation_error", "Tipo de issue invalido.");
  }

  const { page, pageSize } = parsePagination(searchParams, {
    defaultPageSize: 50,
    maxPageSize: 100,
  });

  return withBrand(auth.brandId, async (tx) => {
    const result = await listDataQualityIssues(tx, {
      brandId: auth.brandId,
      issueType: type,
      page,
      pageSize,
    });

    return NextResponse.json({
      ok: true,
      data: result.data,
      meta: result.meta,
    });
  });
}
