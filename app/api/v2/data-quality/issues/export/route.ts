import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import {
  DATA_QUALITY_ISSUE_TYPES,
  exportDataQualityIssues,
  type DataQualityIssueType,
} from "@/lib/data-quality/analysis";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

function isIssueType(value: string | null): value is DataQualityIssueType {
  if (!value) {
    return false;
  }

  return (DATA_QUALITY_ISSUE_TYPES as readonly string[]).includes(value);
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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

  return withBrand(auth.brandId, async (tx) => {
    const rows = await exportDataQualityIssues(tx, {
      brandId: auth.brandId,
      issueType: type,
    });

    let header: string[];
    let mapRow: (row: (typeof rows)[number]) => unknown[];

    if (type === "sync_error") {
      header = ["sku_varejonline", "id_externo", "motivo", "data_sync", "provider"];
      mapRow = (row) => [
        row.sku ?? "",
        row.name,
        row.details ?? "",
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt ?? ""),
        row.sourceProvider ?? "",
      ];
    } else {
      header = [
        "id",
        "issueType",
        "entityType",
        "name",
        "sku",
        "sourceType",
        "sourceProvider",
        "normalizedName",
        "duplicateCount",
        "relatedIds",
        "details",
        "updatedAt",
      ];
      mapRow = (row) => [
        row.id,
        row.issueType,
        row.entityType,
        row.name,
        row.sku ?? "",
        row.sourceType ?? "",
        row.sourceProvider ?? "",
        row.normalizedName ?? "",
        row.duplicateCount ?? "",
        row.relatedIds?.join(" | ") ?? "",
        row.details ?? "",
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt ?? ""),
      ];
    }

    const lines = [
      header.join(","),
      ...rows.map((row) => mapRow(row).map(escapeCsv).join(",")),
    ];

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="data-quality-${type}.csv"`,
      },
    });
  });
}
