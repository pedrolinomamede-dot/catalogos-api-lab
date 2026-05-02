import type { IntegrationImportSettings } from "@/lib/integrations/core/import-settings";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  isActive: boolean;
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
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SELLER" | "VIEWER";
export type OrderIntentChannel = "SHARE_LINK" | "SITE";
export type OrderIntentStatus = "OPEN" | "BILLED" | "CANCELED" | "EXPIRED";
export type ProductRequestStatus =
  | "OPEN"
  | "REVIEWED"
  | "CONTACTED"
  | "RESOLVED"
  | "DISMISSED";
export type StockReservationStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CONVERTED"
  | "CANCELED";
export type PublicAnalyticsEventName =
  | "share_link_viewed"
  | "share_link_add_to_cart"
  | "share_link_remove_from_cart"
  | "share_link_checkout_started";

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
  logoUrl?: string | null;
  cnpj?: string | null;
  isActive?: boolean;
};

export type UpdateBrandRequest = Partial<CreateBrandRequest>;

export type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  usersCount: number;
  shareLinksCount: number;
  orderIntentsCount: number;
  productRequestsCount: number;
};

export type CreatePlatformTenantRequest = {
  brandName: string;
  brandSlug: string;
  brandCnpj?: string | null;
  logoUrl?: string | null;
  adminName?: string | null;
  adminEmail: string;
  adminPassword: string;
  adminWhatsappPhone?: string | null;
};

export type UpdatePlatformTenantStatusRequest = {
  isActive: boolean;
};

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

export type DeleteBaseProductImageV2Result = {
  deletedImageId: string;
  nextImageUrl?: string | null;
};

export type ProductImageLayout = {
  zoom?: number | null;
  offsetX?: number | null;
  offsetY?: number | null;
  trimApplied?: boolean | null;
};

export type BaseProductV2 = {
  id: string;
  brandId: string;
  sku: string;
  name: string;
  description?: string | null;
  line?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  categoryId?: string | null;
  subcategoryId?: string | null;
  brand?: string | null;
  barcode?: string | null;
  additionalBarcodesJson?: unknown;
  size?: string | null;
  department?: string | null;
  section?: string | null;
  groupName?: string | null;
  subgroupName?: string | null;
  unit?: string | null;
  ncmCode?: string | null;
  cestCode?: string | null;
  taxOrigin?: number | null;
  taxFci?: string | null;
  taxBenefitCode?: string | null;
  productClassification?: string | null;
  stockControlMethod?: string | null;
  allowSale?: boolean | null;
  ecommerceAvailable?: boolean | null;
  marketplaceAvailable?: boolean | null;
  imageLayoutJson?: ProductImageLayout | null;
  sourceType: ProductSourceType;
  sourceProvider?: IntegrationProvider | null;
  integrationConnectionId?: string | null;
  sourceExternalId?: string | null;
  sourceExternalCode?: string | null;
  sourceUpdatedAt?: Date | null;
  lastSyncedAt?: Date | null;
  price?: number | null;
  costPrice?: number | null;
  stockQuantity?: number | null;
  minStockQuantity?: number | null;
  maxStockQuantity?: number | null;
  weight?: number | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  categoryLevelsJson?: unknown;
  taxInfoJson?: unknown;
  commercialInfoJson?: unknown;
  logisticsInfoJson?: unknown;
  suppliersJson?: unknown;
  gradeAttributesJson?: unknown;
  externalMetadataJson?: unknown;
  integrationSyncLocked: boolean;
  integrationSyncLockedAt?: Date | null;
  integrationSyncLockReason?: string | null;
  integrationSyncLockedByUserId?: string | null;
  images?: ProductBaseImageV2[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateBaseProductV2Request = {
  sku: string;
  name: string;
  description?: string;
  line?: string;
  imageLayoutJson?: ProductImageLayout | null;
  brand?: string;
  barcode?: string;
  size?: string;
  isActive?: boolean;
};

export type UpdateBaseProductV2Request = Partial<{
  sku: string;
  name: string;
  description: string;
  line: string | null;
  imageLayoutJson: ProductImageLayout | null;
  brand: string | null;
  barcode: string | null;
  size: string | null;
  isActive: boolean;
}>;

export type UpdateBaseProductSyncLocksRequest = {
  ids: string[];
  locked: boolean;
  reason?: string | null;
};

export type ImportBaseProductsCsvV2Item = {
  code: string;
  name: string;
  line?: string;
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

export type AppUserV2 = {
  id: string;
  brandId: string;
  name?: string | null;
  email: string;
  role: UserRole;
  whatsappPhone?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserV2Request = {
  name?: string;
  email: string;
  password: string;
  role: "ADMIN" | "SELLER";
  whatsappPhone?: string | null;
  isActive?: boolean;
};

export type UpdateUserV2Request = Partial<Omit<CreateUserV2Request, "password">> & {
  password?: string;
};

export type MeResponse = {
  userId: string;
  brandId: string;
  brandIsActive: boolean;
  name?: string | null;
  email: string | null;
  role: UserRole;
  whatsappPhone?: string | null;
  isActive: boolean;
};

export type ShareLinkV2 = {
  id: string;
  brandId: string;
  ownerUserId: string;
  name: string;
  token: string;
  slug?: string | null;
  isRevoked: boolean;
  revokedAt?: Date | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerWhatsappPhone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  catalogCount?: number;
  catalogs?: ShareLinkCatalogV2[];
};

export type PdfExportMode = "final" | "editavel";

export type DashboardSummaryV2 = {
  baseProducts: {
    total: number;
    active: number;
    latestImportedAt?: string | Date | null;
    latestImportedSourceType?: ProductSourceType | null;
    latestUpdatedAt?: string | Date | null;
  };
  categories: {
    categoriesTotal: number;
    subcategoriesTotal: number;
  };
  integrations: {
    totalConnections: number;
    connected: number;
    healthy: number;
    providers: IntegrationProvider[];
  };
  catalogs: {
    total: number;
    itemsTotal: number;
  };
  shareLinks: {
    total: number;
    active: number;
    revoked: number;
  };
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
  importSettingsJson?: IntegrationImportSettings | null;
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

export type UpdateIntegrationConnectionImportSettingsRequest = {
  importSettings: IntegrationImportSettings;
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
  slug?: string | null;
  ownerUserId: string;
  ownerName?: string | null;
  ownerWhatsappPhone?: string | null;
  catalogs: ShareLinkPublicCatalogV2[];
};

export type CreatePublicOrderIntentItemRequest = {
  catalogId: string;
  productBaseId: string;
  quantity: number;
};

export type CreatePublicOrderIntentRequest = {
  channel: OrderIntentChannel;
  shareLinkId?: string | null;
  items: CreatePublicOrderIntentItemRequest[];
  customerName?: string | null;
  customerEmail?: string | null;
  customerWhatsapp?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

export type CreatePublicAnalyticsEventRequest = {
  channel: Extract<OrderIntentChannel, "SHARE_LINK">;
  eventName: PublicAnalyticsEventName;
  shareLinkId: string;
  productBaseId?: string | null;
  orderIntentId?: string | null;
  sessionKey?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
  metadataJson?: Record<string, unknown> | null;
};

export type CreatePublicProductRequestRequest = {
  channel: Extract<OrderIntentChannel, "SHARE_LINK">;
  shareLinkId: string;
  requestText: string;
  categoryHint?: string | null;
  quantityHint?: number | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  sessionKey?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrer?: string | null;
};

export type ProductRequestSummary = {
  id: string;
  brandId: string;
  ownerUserId?: string | null;
  shareLinkId?: string | null;
  shareLinkName?: string | null;
  shareLinkSlug?: string | null;
  channel: OrderIntentChannel;
  status: ProductRequestStatus;
  customerProfileId?: string | null;
  customerProfileName?: string | null;
  customerProfileEmail?: string | null;
  customerProfileWhatsapp?: string | null;
  ownerUserName?: string | null;
  ownerUserWhatsapp?: string | null;
  requestText: string;
  categoryHint?: string | null;
  quantityHint?: number | null;
  city?: string | null;
  state?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderIntentSummary = {
  id: string;
  brandId: string;
  ownerUserId?: string | null;
  shareLinkId?: string | null;
  shareLinkName?: string | null;
  shareLinkSlug?: string | null;
  channel: OrderIntentChannel;
  status: OrderIntentStatus;
  customerProfileId?: string | null;
  customerProfileName?: string | null;
  customerProfileEmail?: string | null;
  customerProfileWhatsapp?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerWhatsapp?: string | null;
  paymentMethod?: string | null;
  sellerNameSnapshot?: string | null;
  sellerWhatsappSnapshot?: string | null;
  subtotal?: number | null;
  itemCount: number;
  reservationStatus?: StockReservationStatus | null;
  reservationExpiresAt?: Date | null;
  billedAt?: Date | null;
  canceledAt?: Date | null;
  expiredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateOrderIntentStatusRequest = {
  status: Extract<OrderIntentStatus, "BILLED" | "CANCELED">;
};
