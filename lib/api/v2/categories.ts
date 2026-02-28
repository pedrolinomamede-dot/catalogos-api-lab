import type {
  CategoryV2,
  CreateCategoryV2Request,
  CreateSubcategoryV2Request,
  SubcategoryV2,
  UpdateCategoryV2Request,
  UpdateSubcategoryV2Request,
} from "@/types/api";

import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, withQuery } from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type V2ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CategoriesV2ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export type SubcategoriesV2ListParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listCategoriesV2(
  params?: CategoriesV2ListParams,
): Promise<CategoryV2[] | { data: CategoryV2[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<CategoryV2[], V2ListMeta>>(
    "/api/v2/categories",
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function createCategoryV2(
  body: CreateCategoryV2Request,
): Promise<CategoryV2> {
  const res = await apiPost<CreateCategoryV2Request, ApiEnvelope<CategoryV2>>(
    "/api/v2/categories",
    body,
  );
  return res.data;
}

export async function updateCategoryV2(
  id: string,
  body: UpdateCategoryV2Request,
): Promise<CategoryV2> {
  const res = await apiPatch<UpdateCategoryV2Request, ApiEnvelope<CategoryV2>>(
    `/api/v2/categories/${id}`,
    body,
  );
  return res.data;
}

export async function deleteCategoryV2(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/v2/categories/${id}`);
}

export type CategoryDeleteImpact = {
  productsCount: number;
  subcategoriesCount: number;
};

export async function getCategoryDeleteImpactV2(
  id: string,
): Promise<CategoryDeleteImpact> {
  const url = withQuery(`/api/v2/categories/${id}`, { dryRun: true });
  const res = await apiFetch<ApiEnvelope<CategoryDeleteImpact>>(url, { method: "DELETE" });
  return res.data;
}

export async function listSubcategoriesV2(
  categoryId: string,
  params?: SubcategoriesV2ListParams,
): Promise<SubcategoryV2[] | { data: SubcategoryV2[]; meta?: V2ListMeta }> {
  const res = await apiGet<ApiEnvelope<SubcategoryV2[], V2ListMeta>>(
    `/api/v2/categories/${categoryId}/subcategories`,
    params,
  );
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function createSubcategoryV2(
  categoryId: string,
  body: CreateSubcategoryV2Request,
): Promise<SubcategoryV2> {
  const res = await apiPost<
    CreateSubcategoryV2Request,
    ApiEnvelope<SubcategoryV2>
  >(`/api/v2/categories/${categoryId}/subcategories`, body);
  return res.data;
}

export async function updateSubcategoryV2(
  id: string,
  body: UpdateSubcategoryV2Request,
): Promise<SubcategoryV2> {
  const res = await apiPatch<
    UpdateSubcategoryV2Request,
    ApiEnvelope<SubcategoryV2>
  >(`/api/v2/subcategories/${id}`, body);
  return res.data;
}

export async function deleteSubcategoryV2(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/v2/subcategories/${id}`);
}

export type SubcategoryDeleteImpact = {
  productsCount: number;
};

export async function getSubcategoryDeleteImpactV2(
  id: string,
): Promise<SubcategoryDeleteImpact> {
  const url = withQuery(`/api/v2/subcategories/${id}`, { dryRun: true });
  const res = await apiFetch<ApiEnvelope<SubcategoryDeleteImpact>>(url, { method: "DELETE" });
  return res.data;
}

export type AssignBaseProductCategoryRequest = {
  categoryId: string;
  subcategoryId?: string | null;
};

export async function assignBaseProductCategory(
  baseProductId: string,
  body: AssignBaseProductCategoryRequest,
) {
  const res = await apiPatch<
    AssignBaseProductCategoryRequest,
    ApiEnvelope<unknown>
  >(`/api/v2/base-products/${baseProductId}/category`, body);
  return res.data;
}
