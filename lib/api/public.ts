import type { Brand, Category, Product } from "@/types/api";

import { apiGet, withQuery } from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type PublicProductsResponse = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PublicProductsParams = {
  brandSlug: string;
  page?: number;
  pageSize?: number;
  [key: string]: string | number | boolean | undefined;
};

export async function getPublicBrandBySlug(slug: string): Promise<Brand> {
  const res = await apiGet<ApiEnvelope<Brand>>(`/api/public/brands/${slug}`);
  return res.data;
}

export async function listPublicCategories(
  brandSlug: string,
): Promise<Category[]> {
  const res = await apiGet<ApiEnvelope<Category[]>>(
    withQuery("/api/public/categories", { brandSlug }),
  );
  return res.data;
}

export async function listPublicProducts(
  params: PublicProductsParams,
): Promise<Product[] | { data: Product[]; meta?: unknown }> {
  const res = await apiGet<ApiEnvelope<PublicProductsResponse | Product[]>>(
    withQuery("/api/public/products", params),
  );
  const data = res.data;
  if (Array.isArray(data)) {
    return data;
  }
  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    const { items, ...meta } = data as PublicProductsResponse;
    return { data: items, meta };
  }
  return data as unknown as Product[];
}

export async function getPublicProductById(
  id: string,
  brandSlug?: string,
): Promise<Product> {
  const url = brandSlug
    ? withQuery(`/api/public/products/${id}`, { brandSlug })
    : `/api/public/products/${id}`;
  const res = await apiGet<ApiEnvelope<Product>>(url);
  return res.data;
}
