type PaginationParams = {
  page?: string | null;
  pageSize?: string | null;
};

type PaginationOptions = {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export function parsePagination(
  searchParams: URLSearchParams,
  options?: PaginationOptions,
) {
  const params: PaginationParams = {
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
  };

  const page = normalizePositiveInt(params.page, options?.defaultPage ?? 1);
  const pageSize = normalizePositiveInt(
    params.pageSize,
    options?.defaultPageSize ?? 20,
    options?.maxPageSize ?? 100,
  );
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    take: pageSize,
    skip,
  };
}

function normalizePositiveInt(
  value: string | null | undefined,
  fallback: number,
  max?: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  if (typeof max === "number" && parsed > max) {
    return max;
  }

  return parsed;
}
