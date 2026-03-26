import type {
  DashboardSummaryV2,
  BaseProductsImportResultV2,
  CreateBrandRequest,
  CreateCatalogItemV2Request,
  CreateCatalogV2Request,
  CreateShareLinkV2Request,
  PdfExportMode,
  CreateCategoryV2Request,
  CreateSubcategoryV2Request,
  CreateCategoryRequest,
  ImportBaseProductsCsvV2Item,
  CreateProductRequest,
  UpdateBrandRequest,
  UpdateCategoryRequest,
  UpdateCategoryV2Request,
  UpdateCatalogV2Request,
  UpdateBaseProductV2Request,
  UpdateSubcategoryV2Request,
  UpdateProductRequest,
} from "@/types/api";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet } from "@/lib/api/client";
import {
  createBrand,
  createCategory,
  createProduct,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  deleteVariationImage,
  getBrand,
  getCategory,
  getProduct,
  importProductsCsv,
  listBrands,
  listCategories,
  listProducts,
  reorderVariationImages,
  updateBrand,
  updateCategory,
  updateProduct,
  uploadImages,
  uploadVariationImages,
} from "@/lib/api/admin";
import {
  addBaseProductImageV2,
  deleteBaseProduct,
  deleteBaseProductImageV2,
  importBaseProductsCsvV2,
  listBaseProductImagesV2,
  listBaseProducts,
  updateBaseProductV2,
  updateBaseProductImageV2,
} from "@/lib/api/v2/base-products";
import { getDashboardSummaryV2 } from "@/lib/api/v2/dashboard";
import {
  addCatalogItemV2,
  createCatalogV2,
  deleteCatalogItemV2,
  deleteCatalogV2,
  getCatalogV2,
  listCatalogItemsV2,
  listCatalogsV2,
  updateCatalogV2,
} from "@/lib/api/v2/catalogs";
import {
  createIntegrationConnectionV2,
  disconnectIntegrationConnectionV2,
  getIntegrationConnectionV2,
  listIntegrationConnectionJobsV2,
  listIntegrationConnectionsV2,
  listIntegrationProvidersV2,
  refreshCatalogFromSourceV2,
  refreshCatalogItemFromSourceV2,
  syncIntegrationConnectionV2,
} from "@/lib/api/v2/integrations";
import {
  createShareLinkV2,
  deleteShareLinkV2,
  downloadShareLinkPdfV2,
  getShareLinkV2,
  listShareLinksV2,
  revokeShareLinkV2,
} from "@/lib/api/v2/share-links";
import {
  assignBaseProductCategory,
  createCategoryV2,
  createSubcategoryV2,
  deleteCategoryV2,
  deleteSubcategoryV2,
  listCategoriesV2,
  listSubcategoriesV2,
  updateCategoryV2,
  updateSubcategoryV2,
} from "@/lib/api/v2/categories";
import {
  getPublicBrandBySlug,
  getPublicProductById,
  listPublicCategories,
  listPublicProducts,
} from "@/lib/api/public";
import { queryKeys } from "@/lib/api/query-keys";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type UpdateBrandInput = { id: string; data: UpdateBrandRequest };
type UpdateCategoryInput = { id: string; data: UpdateCategoryRequest };
type UpdateCategoryV2Input = { id: string; data: UpdateCategoryV2Request };
type UpdateSubcategoryV2Input = { id: string; data: UpdateSubcategoryV2Request };
type UpdateProductInput = { id: string; data: UpdateProductRequest };
type UpdateBaseProductInput = { id: string; data: UpdateBaseProductV2Request };
type UpdateBaseProductImageInput = { id: string; imageUrl: string | null };
type DeleteProductOptions = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};
type UploadVariationImagesInput = {
  variationId: string;
  productId?: string;
  files: File[];
  altTexts?: string[];
  invalidateList?: boolean;
};
type DeleteVariationImageInput = {
  variationId: string;
  imageId: string;
  productId?: string;
};
type ReorderVariationImagesInput = {
  variationId: string;
  orderedIds: string[];
  productId?: string;
};

type ProductsParams = Parameters<typeof listProducts>[0];
type PublicProductsParams = Parameters<typeof listPublicProducts>[0];
type BaseProductsParams = Parameters<typeof listBaseProducts>[0];
type CategoriesV2Params = Parameters<typeof listCategoriesV2>[0];
type SubcategoriesV2Params = Parameters<typeof listSubcategoriesV2>[1];
type CatalogsV2Params = Parameters<typeof listCatalogsV2>[0];
type ShareLinksV2Params = Parameters<typeof listShareLinksV2>[0];
type IntegrationConnectionJobsParams = Parameters<typeof listIntegrationConnectionJobsV2>[1];

type CatalogItemsBatchFailure = {
  productBaseId: string;
  error: unknown;
};

type CatalogItemsBatchResult = {
  ok: boolean;
  failures: CatalogItemsBatchFailure[];
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiGet<unknown>("/api/auth/me"),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands.all,
    queryFn: listBrands,
  });
}

export function useBrand(id: string) {
  return useQuery({
    queryKey: queryKeys.brands.byId(id),
    queryFn: () => getBrand(id),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: listCategories,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.byId(id),
    queryFn: () => getCategory(id),
    enabled: Boolean(id),
  });
}

export function useProducts(params?: ProductsParams) {
  return useQuery({
    queryKey: queryKeys.products.all(params),
    queryFn: () => listProducts(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.byId(id),
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useDeleteBaseProductV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (baseProductId: string) => deleteBaseProduct(baseProductId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useBaseProducts(params?: BaseProductsParams) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.baseProducts.list(paramsKey),
    queryFn: () => listBaseProducts(params),
  });
}

export function useUpdateBaseProductV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBaseProductInput) =>
      updateBaseProductV2(input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useUpdateBaseProductImageV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBaseProductImageInput) =>
      updateBaseProductImageV2(input.id, input.imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}


export function useCategoriesV2(params?: CategoriesV2Params) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.categories.list(paramsKey),
    queryFn: () => listCategoriesV2(params),
  });
}

export function useSubcategoriesV2(categoryId: string, params?: SubcategoriesV2Params) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.subcategories.list(categoryId, paramsKey),
    queryFn: () => listSubcategoriesV2(categoryId, params),
    enabled: Boolean(categoryId),
  });
}

export function useCatalogsV2(params?: CatalogsV2Params) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.catalogs.list(paramsKey),
    queryFn: () => listCatalogsV2(params),
  });
}

export function useCatalogV2(id: string) {
  return useQuery({
    queryKey: queryKeys.v2.catalogs.byId(id),
    queryFn: () => getCatalogV2(id),
    enabled: Boolean(id),
  });
}

export function useCatalogItemsV2(catalogId: string) {
  return useQuery({
    queryKey: queryKeys.v2.catalogItems.list(catalogId),
    queryFn: () => listCatalogItemsV2(catalogId),
    enabled: Boolean(catalogId),
  });
}

export function useDashboardSummaryV2() {
  return useQuery<DashboardSummaryV2>({
    queryKey: queryKeys.v2.dashboard.summary,
    queryFn: getDashboardSummaryV2,
  });
}

export function useShareLinksV2(params?: ShareLinksV2Params) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.shareLinks.list(paramsKey),
    queryFn: () => listShareLinksV2(params),
  });
}

export function useShareLinkV2(id: string) {
  return useQuery({
    queryKey: queryKeys.v2.shareLinks.byId(id),
    queryFn: () => getShareLinkV2(id),
    enabled: Boolean(id),
  });
}

export function useIntegrationProviders() {
  return useQuery({
    queryKey: queryKeys.v2.integrations.providers,
    queryFn: listIntegrationProvidersV2,
  });
}

export function useIntegrationConnections() {
  return useQuery({
    queryKey: queryKeys.v2.integrations.connections,
    queryFn: listIntegrationConnectionsV2,
  });
}

export function useIntegrationConnection(id: string) {
  return useQuery({
    queryKey: queryKeys.v2.integrations.connectionById(id),
    queryFn: () => getIntegrationConnectionV2(id),
    enabled: Boolean(id),
  });
}

export function useIntegrationConnectionJobs(
  connectionId: string,
  params?: IntegrationConnectionJobsParams,
) {
  const paramsKey = params ?? {};
  return useQuery({
    queryKey: queryKeys.v2.integrations.jobs(connectionId, paramsKey),
    queryFn: () => listIntegrationConnectionJobsV2(connectionId, params),
    enabled: Boolean(connectionId),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBrandRequest) => createBrand(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}

export function useUpdateBrand(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandInput) =>
      updateBrand(id ?? input.id, input.data),
    onSuccess: (_data, variables) => {
      const targetId = id ?? variables.id;
      queryClient.invalidateQueries({
        queryKey: queryKeys.brands.byId(targetId),
      });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) => deleteBrand(brandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.all });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryRequest) => createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) =>
      updateCategory(id ?? input.id, input.data),
    onSuccess: (_data, variables) => {
      const targetId = id ?? variables.id;
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.byId(targetId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

type DeleteCategoryOptions = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

export function useDeleteCategory(options?: DeleteCategoryOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: async () => {
      options?.onSuccess?.();
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

export function useCreateCategoryV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCategoryV2Request) => createCategoryV2(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useUpdateCategoryV2(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryV2Input) =>
      updateCategoryV2(id ?? input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteCategoryV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => deleteCategoryV2(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useCreateSubcategoryV2(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubcategoryV2Request) =>
      createSubcategoryV2(categoryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories", categoryId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useUpdateSubcategoryV2(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSubcategoryV2Input) =>
      updateSubcategoryV2(input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories", categoryId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteSubcategoryV2(categoryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subcategoryId: string) => deleteSubcategoryV2(subcategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "subcategories", categoryId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.categories.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useAssignBaseProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      baseProductId,
      categoryId,
      subcategoryId,
    }: {
      baseProductId: string;
      categoryId: string;
      subcategoryId?: string | null;
    }) =>
      assignBaseProductCategory(baseProductId, { categoryId, subcategoryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
    },
  });
}

export function useCreateCatalogV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCatalogV2Request) => createCatalogV2(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogs.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useUpdateCatalogV2(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: UpdateCatalogV2Request }) =>
      updateCatalogV2(id ?? input.id, input.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogs.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteCatalogV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catalogId: string) => deleteCatalogV2(catalogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogs.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useAddCatalogItemV2(catalogId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCatalogItemV2Request) => addCatalogItemV2(catalogId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogItems.list(catalogId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useAddCatalogItemsV2(catalogId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productBaseIds: string[]): Promise<CatalogItemsBatchResult> => {
      const uniqueIds = Array.from(new Set(productBaseIds));
      const results = await Promise.allSettled(
        uniqueIds.map((productBaseId) =>
          addCatalogItemV2(catalogId, { productBaseId }),
        ),
      );

      const failures: CatalogItemsBatchFailure[] = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failures.push({
            productBaseId: uniqueIds[index],
            error: result.reason,
          });
        }
      });

      return {
        ok: failures.length === 0,
        failures,
      };
    },
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.v2.catalogItems.list(catalogId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteCatalogItemV2(catalogId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteCatalogItemV2(catalogId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogItems.list(catalogId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useRefreshCatalogFromSourceV2(catalogId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => refreshCatalogFromSourceV2(catalogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogItems.list(catalogId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogs.byId(catalogId) });
    },
  });
}

export function useRefreshCatalogItemFromSourceV2(catalogId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => refreshCatalogItemFromSourceV2(catalogId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.catalogItems.list(catalogId) });
    },
  });
}

export function useCreateShareLinkV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateShareLinkV2Request) => createShareLinkV2(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.shareLinks.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useGenerateShareLinkPdfV2() {
  return useMutation({
    mutationFn: ({
      shareLinkId,
      mode = "final",
      theme,
    }: {
      shareLinkId: string;
      mode?: PdfExportMode;
      theme?: string | null;
    }) => downloadShareLinkPdfV2(shareLinkId, mode, theme),
  });
}

export function useRevokeShareLinkV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareLinkId: string) => revokeShareLinkV2(shareLinkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.shareLinks.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteShareLinkV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareLinkId: string) => deleteShareLinkV2(shareLinkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.shareLinks.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useCreateIntegrationConnectionV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createIntegrationConnectionV2>[0]) =>
      createIntegrationConnectionV2(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.integrations.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDisconnectIntegrationConnectionV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => disconnectIntegrationConnectionV2(connectionId),
    onSuccess: (_data, connectionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.integrations.connections });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.integrations.connectionById(connectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useSyncIntegrationConnectionV2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      connectionId,
      body,
    }: {
      connectionId: string;
      body: Parameters<typeof syncIntegrationConnectionV2>[1];
    }) => syncIntegrationConnectionV2(connectionId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.integrations.connections });
      queryClient.invalidateQueries({
        queryKey: queryKeys.v2.integrations.jobs(variables.connectionId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductRequest) => createProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
  });
}

export function useUpdateProduct(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) =>
      updateProduct(id ?? input.id, input.data),
    onSuccess: (_data, variables) => {
      const targetId = id ?? variables.id;
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.byId(targetId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
  });
}

export function useDeleteProduct(options?: DeleteProductOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: async () => {
      options?.onSuccess?.();
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
      toastSuccess("Produto excluído");
    },
    onError: (error) => {
      toastError("Não foi possível excluir", "Tente novamente.");
      options?.onError?.(error);
    },
  });
}

export function useImportProductsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateProductRequest[]) => importProductsCsv(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
  });
}

export type BaseProductsImportResult = BaseProductsImportResultV2;

export function useImportBaseProductsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      items: ImportBaseProductsCsvV2Item[],
    ): Promise<BaseProductsImportResult> => importBaseProductsCsvV2(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useUploadVariationImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadVariationImagesInput) => {
      const formPayload = new FormData();
      input.files.forEach((file) => {
        formPayload.append("files", file);
      });
      const response = (await uploadImages(formPayload)) as {
        data?: Array<{
          imageUrl: string;
          thumbnailUrl?: string;
          contentType?: string;
          size?: number;
        }>;
      };
      const uploads = response?.data ?? [];
      if (uploads.length > 0) {
        await Promise.all(
          uploads.map((upload, index) =>
            uploadVariationImages(input.variationId, {
              imageUrl: upload.imageUrl,
              thumbnailUrl: upload.thumbnailUrl,
              altText: input.altTexts?.[index],
            }),
          ),
        );
      }
      return { uploads };
    },
    onSuccess: (_data, variables) => {
      if (variables.productId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byId(variables.productId),
        });
      }
      if (variables.invalidateList) {
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
      }
    },
  });
}


export function useDeleteVariationImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteVariationImageInput) =>
      deleteVariationImage(input.variationId, input.imageId),
    onSuccess: (_data, variables) => {
      if (variables.productId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byId(variables.productId),
        });
      }
    },
  });
}

export function useReorderVariationImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderVariationImagesInput) =>
      reorderVariationImages(input.variationId, input.orderedIds),
    onSuccess: (_data, variables) => {
      if (variables.productId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.byId(variables.productId),
        });
      }
    },
  });
}

export function usePublicBrand(slug: string) {
  return useQuery({
    queryKey: queryKeys.publicBrand.bySlug(slug),
    queryFn: () => getPublicBrandBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function usePublicCategories(brandSlug: string) {
  return useQuery({
    queryKey: queryKeys.publicCategories.list(brandSlug),
    queryFn: () => listPublicCategories(brandSlug),
    enabled: Boolean(brandSlug),
  });
}

export function usePublicProducts(params?: PublicProductsParams) {
  const enabled = Boolean(params?.brandSlug);
  const paramsKey = params ?? { brandSlug: "" };
  return useQuery({
    queryKey: queryKeys.publicProducts.list(paramsKey),
    queryFn: () => listPublicProducts(paramsKey),
    enabled,
  });
}

export function usePublicProduct(id: string, brandSlug?: string) {
  return useQuery({
    queryKey: queryKeys.publicProducts.byId(id, brandSlug),
    queryFn: () => getPublicProductById(id, brandSlug),
    enabled: Boolean(id),
  });
}

export function useBaseProductImagesV2(productBaseId: string) {
  return useQuery({
    queryKey: ["v2", "base-products", productBaseId, "images"],
    queryFn: () => listBaseProductImagesV2(productBaseId),
    enabled: Boolean(productBaseId),
  });
}

export function useAddBaseProductImageV2(productBaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageUrl: string) => addBaseProductImageV2(productBaseId, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "base-products", productBaseId, "images"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}

export function useDeleteBaseProductImageV2(productBaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => deleteBaseProductImageV2(productBaseId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "base-products", productBaseId, "images"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.v2.dashboard.summary });
    },
  });
}
