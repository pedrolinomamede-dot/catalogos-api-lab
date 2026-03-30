import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/authz";
import { withBrand } from "@/lib/prisma";
import { jsonError } from "@/lib/utils/errors";

type ParsedBulkItem = {
  sourceIndex: number;
  outputIndex: number;
  code: string;
  normalizedCode?: string;
  name: string;
  line?: string;
  barcode?: string;
  size?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  categoryId?: string;
  subcategoryId?: string;
};

type ImportErrorItem = {
  index: number;
  code: string;
  normalizedCode?: string;
  name: string;
  errorCode: string;
  message: string;
};

const DIGIT_ONLY_REGEX = /\D/g;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(payload: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(payload, key);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCode(value: string) {
  const digits = value.replace(DIGIT_ONLY_REGEX, "");
  if (!digits) {
    return null;
  }
  if (digits.length > 4) {
    return digits.slice(-4);
  }
  return digits.padStart(4, "0");
}

function resolveOutputIndex(raw: Record<string, unknown>, index: number) {
  if (!hasOwn(raw, "rowIndex")) {
    return index;
  }

  const value = raw.rowIndex;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isInteger(value)
  ) {
    return null;
  }

  return value;
}

function readOptionalString(raw: Record<string, unknown>, key: string) {
  if (!hasOwn(raw, key) || raw[key] === undefined || raw[key] === null) {
    return { value: undefined as string | undefined };
  }

  if (typeof raw[key] !== "string") {
    return { error: `${key} must be a string` };
  }

  const value = raw[key].trim();
  return { value: value.length > 0 ? value : undefined };
}

function parseItem(raw: unknown, index: number) {
  if (!isPlainObject(raw)) {
    return {
      error: {
        index,
        code: "",
        name: "",
        errorCode: "invalid_row",
        message: "Each item must be an object",
      } satisfies ImportErrorItem,
    };
  }

  const outputIndex = resolveOutputIndex(raw, index);
  if (outputIndex === null) {
    return {
      error: {
        index,
        code: "",
        name: "",
        errorCode: "invalid_row_index",
        message: "rowIndex must be a non-negative integer",
      } satisfies ImportErrorItem,
    };
  }

  const rawCode = raw.code;
  const code =
    typeof rawCode === "string" || typeof rawCode === "number"
      ? String(rawCode).trim()
      : "";

  if (!code) {
    return {
      error: {
        index: outputIndex,
        code: "",
        name: "",
        errorCode: "code_required",
        message: "Code is required",
      } satisfies ImportErrorItem,
    };
  }

  if (typeof raw.name !== "string") {
    return {
      error: {
        index: outputIndex,
        code,
        name: "",
        errorCode: "name_required",
        message: "Name is required",
      } satisfies ImportErrorItem,
    };
  }

  const name = raw.name.trim();
  if (!name) {
    return {
      error: {
        index: outputIndex,
        code,
        name: "",
        errorCode: "name_required",
        message: "Name is required",
      } satisfies ImportErrorItem,
    };
  }

  const barcodeResult = readOptionalString(raw, "barcode");
  if (barcodeResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_barcode",
        message: barcodeResult.error,
      } satisfies ImportErrorItem,
    };
  }

  const sizeResult = readOptionalString(raw, "size");
  if (sizeResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_size",
        message: sizeResult.error,
      } satisfies ImportErrorItem,
    };
  }

  const lineResult = readOptionalString(raw, "line");
  if (lineResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_line",
        message: lineResult.error,
      } satisfies ImportErrorItem,
    };
  }

  const brandResult = readOptionalString(raw, "brand");
  if (brandResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_brand",
        message: brandResult.error,
      } satisfies ImportErrorItem,
    };
  }

  const categoryResult = readOptionalString(raw, "category");
  if (categoryResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_category",
        message: categoryResult.error,
      } satisfies ImportErrorItem,
    };
  }

  const subcategoryResult = readOptionalString(raw, "subcategory");
  if (subcategoryResult.error) {
    return {
      error: {
        index: outputIndex,
        code,
        name,
        errorCode: "invalid_subcategory",
        message: subcategoryResult.error,
      } satisfies ImportErrorItem,
    };
  }

  return {
    data: {
      sourceIndex: index,
      outputIndex,
      code,
      name,
      line: lineResult.value,
      barcode: barcodeResult.value,
      size: sizeResult.value,
      brand: brandResult.value,
      category: categoryResult.value,
      subcategory: subcategoryResult.value,
    } satisfies ParsedBulkItem,
  };
}

function setError(
  errorsByRow: Map<number, ImportErrorItem>,
  row: ParsedBulkItem,
  errorCode: string,
  message: string,
) {
  if (errorsByRow.has(row.sourceIndex)) {
    return;
  }

  errorsByRow.set(row.sourceIndex, {
    index: row.outputIndex,
    code: row.code,
    normalizedCode: row.normalizedCode,
    name: row.name,
    errorCode,
    message,
  });
}

export async function POST(request: Request) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Invalid JSON payload");
  }

  if (!isPlainObject(body) || !Array.isArray(body.items)) {
    return jsonError(400, "validation_error", "Payload must be an object with items[]");
  }

  if (body.items.length === 0) {
    return jsonError(400, "validation_error", "At least one item is required");
  }

  const errorsByRow = new Map<number, ImportErrorItem>();
  const parsedRows: ParsedBulkItem[] = [];

  body.items.forEach((item, index) => {
    const parsed = parseItem(item, index);
    if (parsed.error) {
      errorsByRow.set(index, parsed.error);
      return;
    }
    parsedRows.push(parsed.data);
  });

  const normalizedCodeToFirstRow = new Map<string, number>();
  for (const row of parsedRows) {
    if (errorsByRow.has(row.sourceIndex)) {
      continue;
    }

    const normalized = normalizeCode(row.code);
    if (!normalized) {
      setError(errorsByRow, row, "invalid_code", "Code must contain at least one digit");
      continue;
    }

    row.normalizedCode = normalized;

    if (normalizedCodeToFirstRow.has(normalized)) {
      setError(
        errorsByRow,
        row,
        "duplicate_code_payload",
        "Normalized code is duplicated within the same import payload",
      );
      continue;
    }

    normalizedCodeToFirstRow.set(normalized, row.sourceIndex);
  }

  let created = 0;

  await withBrand(auth.brandId, async (tx) => {
    const categories = await tx.categoryV2.findMany({
      where: { brandId: auth.brandId },
      select: { id: true, name: true },
    });
    const categoryLookup = new Map<string, Array<{ id: string; name: string }>>();
    const addCategoryToLookup = (category: { id: string; name: string }) => {
      const key = normalizeText(category.name);
      const list = categoryLookup.get(key) ?? [];
      if (!list.some((item) => item.id === category.id)) {
        list.push(category);
        categoryLookup.set(key, list);
      }
    };
    categories.forEach((category) => {
      addCategoryToLookup(category);
    });

    const subcategories = await tx.subcategoryV2.findMany({
      where: { brandId: auth.brandId },
      select: { id: true, name: true, categoryId: true },
    });
    const subcategoryLookup = new Map<
      string,
      Array<{ id: string; name: string; categoryId: string }>
    >();
    const addSubcategoryToLookup = (subcategory: {
      id: string;
      name: string;
      categoryId: string;
    }) => {
      const key = `${subcategory.categoryId}:${normalizeText(subcategory.name)}`;
      const list = subcategoryLookup.get(key) ?? [];
      if (!list.some((item) => item.id === subcategory.id)) {
        list.push(subcategory);
        subcategoryLookup.set(key, list);
      }
    };
    subcategories.forEach((subcategory) => {
      addSubcategoryToLookup(subcategory);
    });

    const validCodes = parsedRows
      .filter((row) => !errorsByRow.has(row.sourceIndex) && row.normalizedCode)
      .map((row) => row.normalizedCode as string);

    if (validCodes.length > 0) {
      const existing = await tx.productBaseV2.findMany({
        where: {
          brandId: auth.brandId,
          sku: { in: Array.from(new Set(validCodes)) },
        },
        select: { sku: true },
      });

      const existingCodes = new Set(existing.map((item) => item.sku));

      parsedRows.forEach((row) => {
        if (errorsByRow.has(row.sourceIndex) || !row.normalizedCode) {
          return;
        }
        if (existingCodes.has(row.normalizedCode)) {
          setError(
            errorsByRow,
            row,
            "duplicate_code_db",
            "Normalized code already exists in Base Geral",
          );
        }
      });
    }

    for (const row of parsedRows) {
      if (errorsByRow.has(row.sourceIndex)) {
        continue;
      }

      if (row.subcategory && !row.category) {
        setError(
          errorsByRow,
          row,
          "subcategory_without_category",
          "Subcategory requires a valid category",
        );
        continue;
      }

      if (!row.category) {
        continue;
      }

      const normalizedCategory = normalizeText(row.category);
      let categoryCandidates = categoryLookup.get(normalizedCategory) ?? [];

      if (categoryCandidates.length === 0) {
        try {
          const createdCategory = await tx.categoryV2.create({
            data: {
              brandId: auth.brandId,
              name: row.category,
            },
            select: {
              id: true,
              name: true,
            },
          });
          addCategoryToLookup(createdCategory);
          categoryCandidates = categoryLookup.get(normalizedCategory) ?? [];
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            const existingCategory = await tx.categoryV2.findFirst({
              where: {
                brandId: auth.brandId,
                name: row.category,
              },
              select: {
                id: true,
                name: true,
              },
            });
            if (existingCategory) {
              addCategoryToLookup(existingCategory);
              categoryCandidates = categoryLookup.get(normalizedCategory) ?? [];
            }
          } else {
            setError(
              errorsByRow,
              row,
              "create_category_failed",
              "Could not create category",
            );
            continue;
          }
        }
      }

      if (categoryCandidates.length === 0) {
        setError(
          errorsByRow,
          row,
          "create_category_failed",
          "Could not resolve category",
        );
        continue;
      }

      if (categoryCandidates.length > 1) {
        setError(
          errorsByRow,
          row,
          "ambiguous_category",
          "Category match is ambiguous after normalization",
        );
        continue;
      }

      const category = categoryCandidates[0];
      row.categoryId = category.id;

      if (!row.subcategory) {
        continue;
      }

      const normalizedSubcategory = normalizeText(row.subcategory);
      const subcategoryKey = `${category.id}:${normalizedSubcategory}`;
      let subcategoryCandidates = subcategoryLookup.get(subcategoryKey) ?? [];

      if (subcategoryCandidates.length === 0) {
        try {
          const createdSubcategory = await tx.subcategoryV2.create({
            data: {
              brandId: auth.brandId,
              categoryId: category.id,
              name: row.subcategory,
            },
            select: {
              id: true,
              name: true,
              categoryId: true,
            },
          });
          addSubcategoryToLookup(createdSubcategory);
          subcategoryCandidates = subcategoryLookup.get(subcategoryKey) ?? [];
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            const existingSubcategory = await tx.subcategoryV2.findFirst({
              where: {
                brandId: auth.brandId,
                categoryId: category.id,
                name: row.subcategory,
              },
              select: {
                id: true,
                name: true,
                categoryId: true,
              },
            });
            if (existingSubcategory) {
              addSubcategoryToLookup(existingSubcategory);
              subcategoryCandidates = subcategoryLookup.get(subcategoryKey) ?? [];
            }
          } else {
            setError(
              errorsByRow,
              row,
              "create_subcategory_failed",
              "Could not create subcategory",
            );
            continue;
          }
        }
      }

      if (subcategoryCandidates.length === 0) {
        setError(
          errorsByRow,
          row,
          "create_subcategory_failed",
          "Could not resolve subcategory",
        );
        continue;
      }

      if (subcategoryCandidates.length > 1) {
        setError(
          errorsByRow,
          row,
          "ambiguous_subcategory",
          "Subcategory match is ambiguous after normalization",
        );
        continue;
      }

      row.subcategoryId = subcategoryCandidates[0].id;
    }

    for (const row of parsedRows) {
      if (errorsByRow.has(row.sourceIndex) || !row.normalizedCode) {
        continue;
      }

      try {
        await tx.productBaseV2.create({
          data: {
            brandId: auth.brandId,
            sku: row.normalizedCode,
            name: row.name,
            line: row.line,
            brand: row.brand,
            barcode: row.barcode,
            size: row.size,
            categoryId: row.categoryId,
            subcategoryId: row.subcategoryId,
            sourceType: "CSV",
          },
        });
        created += 1;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          setError(
            errorsByRow,
            row,
            "duplicate_code_db",
            "Normalized code already exists in Base Geral",
          );
          continue;
        }

        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (
            message.includes("unknown argument `brand`") ||
            message.includes("unknown argument `size`") ||
            message.includes("unknown argument `barcode`")
          ) {
            setError(
              errorsByRow,
              row,
              "schema_mismatch",
              "Servidor desatualizado apos mudanca de schema. Reinicie o npm run dev.",
            );
            continue;
          }
        }

        setError(
          errorsByRow,
          row,
          "create_failed",
          "Could not create base product for this row",
        );
      }
    }
  });

  const errors = Array.from(errorsByRow.values()).sort((a, b) => a.index - b.index);

  return NextResponse.json({
    ok: true,
    data: {
      created,
      failed: errors.length,
      errors,
    },
  });
}
