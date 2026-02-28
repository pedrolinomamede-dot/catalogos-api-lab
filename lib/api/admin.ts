import type {
  Brand,
  Category,
  CreateBrandRequest,
  CreateCategoryRequest,
  CreateProductImageRequest,
  CreateProductRequest,
  CreateProductVariationRequest,
  Product,
  ProductImage,
  ProductVariation,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateProductRequest,
} from "@/types/api";

import {
  apiDelete,
  apiFetch,
  apiGet,
  apiPatch,
  apiPost,
  withQuery,
} from "@/lib/api/client";

type ApiEnvelope<T, M = unknown> = {
  ok: true;
  data: T;
  meta?: M;
};

type VariationPayload = Pick<
  ProductVariation,
  "variantType" | "variantValue" | "price" | "stockQuantity" | "barcode"
>;

const isFormDataPayload = (payload: unknown): payload is FormData =>
  typeof FormData !== "undefined" && payload instanceof FormData;

const toArray = <T>(value: T | T[]) => (Array.isArray(value) ? value : [value]);

export async function listBrands(): Promise<Brand[]> {
  const res = await apiGet<ApiEnvelope<Brand | Brand[]>>("/api/brands");
  return toArray(res.data);
}

export async function getBrand(id: string): Promise<Brand> {
  const res = await apiGet<ApiEnvelope<Brand>>(`/api/brands/${id}`);
  return res.data;
}

export async function createBrand(
  body: CreateBrandRequest,
): Promise<{ data: Brand; meta?: { requiresReauth?: boolean } } | Brand> {
  const res = await apiPost<
    CreateBrandRequest,
    ApiEnvelope<Brand, { requiresReauth?: boolean }>
  >("/api/brands", body);
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function updateBrand(
  id: string,
  body: UpdateBrandRequest,
): Promise<Brand> {
  const res = await apiPatch<UpdateBrandRequest, ApiEnvelope<Brand>>(
    `/api/brands/${id}`,
    body,
  );
  return res.data;
}

export async function deleteBrand(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/brands/${id}`);
}

export async function listCategories(): Promise<Category[]> {
  const res = await apiGet<ApiEnvelope<Category[]>>("/api/categories");
  return res.data;
}

export async function getCategory(id: string): Promise<Category> {
  const res = await apiGet<ApiEnvelope<Category>>(`/api/categories/${id}`);
  return res.data;
}

export async function createCategory(
  body: CreateCategoryRequest,
): Promise<Category> {
  const res = await apiPost<CreateCategoryRequest, ApiEnvelope<Category>>(
    "/api/categories",
    body,
  );
  return res.data;
}

export async function updateCategory(
  id: string,
  body: UpdateCategoryRequest,
): Promise<Category> {
  const res = await apiPatch<UpdateCategoryRequest, ApiEnvelope<Category>>(
    `/api/categories/${id}`,
    body,
  );
  return res.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/categories/${id}`);
}

export async function listProducts(
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<Product[] | { data: Product[]; meta?: unknown }> {
  const url = params ? withQuery("/api/products", params) : "/api/products";
  const res = await apiGet<ApiEnvelope<Product[]>>(url);
  return res.meta ? { data: res.data, meta: res.meta } : res.data;
}

export async function getProduct(id: string): Promise<Product> {
  const res = await apiGet<ApiEnvelope<Product>>(`/api/products/${id}`);
  return res.data;
}

export async function createProduct(
  body: CreateProductRequest,
): Promise<Product> {
  const res = await apiPost<CreateProductRequest, ApiEnvelope<Product>>(
    "/api/products",
    body,
  );
  return res.data;
}

export async function updateProduct(
  id: string,
  body: UpdateProductRequest,
): Promise<Product> {
  const res = await apiPatch<UpdateProductRequest, ApiEnvelope<Product>>(
    `/api/products/${id}`,
    body,
  );
  return res.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(`/api/products/${id}`);
}

export async function bulkCreateProducts(body: unknown): Promise<unknown> {
  const res = await apiPost<unknown, ApiEnvelope<unknown>>(
    "/api/products/bulk",
    body,
  );
  return res.data;
}

type BulkImportResult = {
  created: number;
  skipped: number;
  skippedItems: Array<{ index: number; name: string; reason: string }>;
  errors: unknown[];
};

export async function importProductsCsv(
  items: CreateProductRequest[],
): Promise<BulkImportResult> {
  const res = await apiPost<
    { items: CreateProductRequest[] },
    ApiEnvelope<BulkImportResult>
  >("/api/products/bulk", { items });
  return res.data;
}

export async function listProductVariations(
  productId: string,
): Promise<ProductVariation[]> {
  const product = await getProduct(productId);
  return product.variations ?? [];
}

export async function createProductVariation(
  productId: string,
  body: CreateProductVariationRequest,
): Promise<ProductVariation> {
  const res = await apiPost<
    CreateProductVariationRequest,
    ApiEnvelope<ProductVariation>
  >(`/api/products/${productId}/variations`, body);
  return res.data;
}

export async function updateProductVariation(
  productId: string,
  variationId: string,
  body: Partial<VariationPayload>,
): Promise<ProductVariation> {
  const res = await apiPatch<Partial<VariationPayload>, ApiEnvelope<ProductVariation>>(
    `/api/products/${productId}/variations/${variationId}`,
    body,
  );
  return res.data;
}

export async function deleteProductVariation(
  productId: string,
  variationId: string,
): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(
    `/api/products/${productId}/variations/${variationId}`,
  );
}

export async function listVariationImages(
  variationId: string,
): Promise<ProductImage[]> {
  const res = await apiGet<ApiEnvelope<ProductImage[]>>(
    `/api/variations/${variationId}/images`,
  );
  return res.data;
}

export async function uploadVariationImages(
  variationId: string,
  formData: FormData | CreateProductImageRequest,
): Promise<unknown> {
  const payload = isFormDataPayload(formData)
    ? formData
    : JSON.stringify(formData);
  return apiFetch<unknown>(`/api/variations/${variationId}/images`, {
    method: "POST",
    body: payload,
  });
}

export async function deleteVariationImage(
  variationId: string,
  imageId: string,
): Promise<void> {
  await apiDelete<ApiEnvelope<unknown>>(
    `/api/variations/${variationId}/images/${imageId}`,
  );
}

export async function reorderVariationImages(
  variationId: string,
  orderedIds: string[],
): Promise<void> {
  await apiPatch<{ orderedIds: string[] }, ApiEnvelope<unknown>>(
    `/api/variations/${variationId}/images/reorder`,
    { orderedIds },
  );
}

export async function uploadImages(formData: FormData): Promise<unknown> {
  return apiFetch<unknown>("/api/images/upload", {
    method: "POST",
    body: formData,
  });
}
