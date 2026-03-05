export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  integrationMode: IntegrationMode;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationMode = "MANUAL_CSV" | "INTEGRATION";

export type IntegrationProvider =
  | "VAREJONLINE"
  | "OMIE"
  | "TINY"
  | "BLING"
  | "CUSTOM";

export type ProductSourceType = "MANUAL" | "CSV" | "INTEGRATION";

export type IntegrationConnectionStatus =
  | "CONNECTED"
  | "EXPIRED"
  | "ERROR"
  | "DISCONNECTED";

export type IntegrationSyncJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED";

export type IntegrationSyncJobMode = "MANUAL" | "SCHEDULED" | "WEBHOOK";

export type IntegrationSyncResource = "FULL" | "PRODUCTS" | "CATEGORIES" | "IMAGES";

export type Category = {
  id: string;
  brandId: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  sortOrder: number;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductImage = {
  id: string;
  variationId: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductVariation = {
  id: string;
  productId: string;
  brandId: string;
  variantType?: string | null;
  variantValue?: string | null;
  price: number;
  stockQuantity: number;
  barcode?: string | null;
  images?: ProductImage[];
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: string;
  brandId: string;
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  isActive: boolean;
  variations?: ProductVariation[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBrandRequest = {
  name: string;
  slug: string;
  logoUrl?: string;
};

export type UpdateBrandRequest = Partial<CreateBrandRequest>;

export type CreateCategoryRequest = {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
};

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export type CreateProductVariationRequest = {
  variantType?: string;
  variantValue?: string;
  price: number;
  stockQuantity?: number;
  barcode?: string;
};

export type CreateProductRequest = {
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  variations?: CreateProductVariationRequest[];
};

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  categoryId?: string | null;
};

export type CreateProductImageRequest = {
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder?: number;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ProductBaseImageV2 = {
  id: string;
  brandId: string;
  productBaseId: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: Date;
};

export type BaseProductV2 = {
  id: string;
  brandId: string;
  sku: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  categoryId?: string | null;
  subcategoryId?: string | null;
  brand?: string | null;
  barcode?: string | null;
  size?: string | null;
  sourceType: ProductSourceType;
  sourceProvider?: IntegrationProvider | null;
  integrationConnectionId?: string | null;
  sourceExternalId?: string | null;
  sourceExternalCode?: string | null;
  sourceUpdatedAt?: Date | null;
  lastSyncedAt?: Date | null;
  price?: number | null;
  stockQuantity?: number | null;
  externalMetadataJson?: unknown;
  images?: ProductBaseImageV2[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBaseProductV2Request = {
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  barcode?: string;
  size?: string;
  isActive?: boolean;
};

export type UpdateBaseProductV2Request = Partial<{
  sku: string;
  name: string;
  description: string;
  brand: string | null;
  barcode: string | null;
  size: string | null;
  isActive: boolean;
}>;

export type ImportBaseProductsCsvV2Item = {
  code: string;
  name: string;
  barcode?: string;
  size?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  rowIndex?: number;
};

export type BaseProductsImportErrorV2 = {
  index: number;
  code: string;
  normalizedCode?: string;
  name: string;
  errorCode: string;
  message: string;
};

export type BaseProductsImportResultV2 = {
  created: number;
  failed: number;
  errors: BaseProductsImportErrorV2[];
};

export type CategoryV2 = {
  id: string;
  brandId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SubcategoryV2 = {
  id: string;
  brandId: string;
  categoryId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCategoryV2Request = {
  name: string;
};

export type UpdateCategoryV2Request = Partial<CreateCategoryV2Request>;

export type CreateSubcategoryV2Request = {
  name: string;
};

export type UpdateSubcategoryV2Request = Partial<CreateSubcategoryV2Request>;

export type CatalogV2 = {
  id: string;
  brandId: string;
  name: string;
  description?: string | null;
  pdfBackgroundImageUrl?: string | null;
  pdfHeaderLeftLogoUrl?: string | null;
  pdfHeaderRightLogoUrl?: string | null;
  pdfStripeBgColor?: string | null;
  pdfStripeLineColor?: string | null;
  pdfStripeTextColor?: string | null;
  pdfStripeFontFamily?: string | null;
  pdfStripeFontWeight?: number | null;
  pdfStripeFontSize?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CatalogItemV2 = {
  id: string;
  brandId?: string;
  catalogId: string;
  productBaseId: string;
  sortOrder?: number | null;
  createdAt: Date;
  productBase?: Pick<
    BaseProductV2,
    "id" | "name" | "sku" | "sourceType" | "sourceProvider"
  >;
  snapshot?: CatalogItemSnapshotV2 | null;
};

export type CatalogItemSnapshotV2 = {
  id: string;
  catalogItemId: string;
  snapshotVersion: number;
  sourceType: ProductSourceType;
  sourceProvider?: IntegrationProvider | null;
  sourceExternalId?: string | null;
  sourceExternalCode?: string | null;
  name: string;
  code: string;
  barcode?: string | null;
  brand?: string | null;
  description?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  price?: number | null;
  primaryImageUrl?: string | null;
  galleryJson?: unknown;
  attributesJson?: unknown;
  capturedAt: Date;
  refreshedAt?: Date | null;
};

export type CreateCatalogV2Request = {
  name: string;
  description?: string | null;
  pdfHeaderLeftLogoUrl?: string | null;
  pdfHeaderRightLogoUrl?: string | null;
  pdfStripeBgColor?: string | null;
  pdfStripeLineColor?: string | null;
  pdfStripeTextColor?: string | null;
  pdfStripeFontFamily?: string | null;
  pdfStripeFontWeight?: number | null;
  pdfStripeFontSize?: number | null;
};

export type UpdateCatalogV2Request = Partial<CreateCatalogV2Request> & {
  pdfBackgroundImageUrl?: string | null;
};

export type CreateCatalogItemV2Request = {
  productBaseId: string;
  sortOrder?: number | null;
};

export type ShareLinkCatalogV2 = {
  id: string;
  name: string;
  description?: string | null;
};

export type ShareLinkV2 = {
  id: string;
  brandId: string;
  name: string;
  token: string;
  isRevoked: boolean;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  catalogCount?: number;
  catalogs?: ShareLinkCatalogV2[];
};

export type IntegrationProviderDescriptor = {
  provider: IntegrationProvider;
  label: string;
  supportsOauth: boolean;
  supportsWebhook: boolean;
  supportsSync: boolean;
  capabilities: {
    products: boolean;
    categories: boolean;
    images: boolean;
    stock: boolean;
    price: boolean;
  };
  configured: boolean;
};

export type IntegrationConnectionV2 = {
  id: string;
  brandId: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  externalCompanyId?: string | null;
  externalCompanyName?: string | null;
  externalCompanyDocument?: string | null;
  tokenExpiresAt?: Date | null;
  lastSyncAt?: Date | null;
  lastSuccessfulSyncAt?: Date | null;
  lastSyncError?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationSyncJobV2 = {
  id: string;
  brandId: string;
  integrationConnectionId: string;
  provider: IntegrationProvider;
  resource: IntegrationSyncResource;
  mode: IntegrationSyncJobMode;
  status: IntegrationSyncJobStatus;
  statsJson?: unknown;
  errorJson?: unknown;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationConnectionCreateRequest = {
  provider: IntegrationProvider;
};

export type IntegrationConnectionCreateResponse = {
  connection?: IntegrationConnectionV2 | null;
  authorizationUrl?: string | null;
};

export type IntegrationSyncRequest = {
  resource?: IntegrationSyncResource;
  mode?: IntegrationSyncJobMode;
};

export type CreateShareLinkV2Request = {
  name: string;
  catalogIds: string[];
};

export type ShareLinkPublicCatalogV2 = {
  id: string;
  name: string;
  description?: string | null;
};

export type ShareLinkPublicV2 = {
  id: string;
  brandId: string;
  name: string;
  catalogs: ShareLinkPublicCatalogV2[];
};
