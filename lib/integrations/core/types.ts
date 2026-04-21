export const INTEGRATION_PROVIDERS = [
  "VAREJONLINE",
  "OMIE",
  "TINY",
  "BLING",
  "CUSTOM",
] as const;

export type IntegrationProviderName = (typeof INTEGRATION_PROVIDERS)[number];

export type IntegrationProviderDescriptor = {
  provider: IntegrationProviderName;
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

export type IntegrationStatePayload = {
  brandId: string;
  provider: IntegrationProviderName;
  issuedAt: number;
};

export type IntegrationAuthTokens = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  externalCompanyId?: string | null;
  externalCompanyName?: string | null;
  externalCompanyDocument?: string | null;
};

export type NormalizedExternalCategory = {
  id: string | null;
  name: string;
  level: string | null;
};

export type NormalizedExternalProduct = {
  externalId: string;
  externalCode: string | null;
  sourceUpdatedAt: Date | null;
  name: string;
  description: string | null;
  line: string | null;
  brand: string | null;
  barcode: string | null;
  additionalBarcodes: string[];
  size: string | null;
  department: string | null;
  section: string | null;
  groupName: string | null;
  subgroupName: string | null;
  unit: string | null;
  categoryExternalId: string | null;
  categoryName: string | null;
  subcategoryExternalId: string | null;
  subcategoryName: string | null;
  categories: NormalizedExternalCategory[];
  price: number | null;
  costPrice: number | null;
  stockQuantity: number | null;
  minStockQuantity: number | null;
  maxStockQuantity: number | null;
  weight: number | null;
  height: number | null;
  width: number | null;
  length: number | null;
  ncmCode: string | null;
  cestCode: string | null;
  taxOrigin: number | null;
  taxFci: string | null;
  taxBenefitCode: string | null;
  productClassification: string | null;
  stockControlMethod: string | null;
  allowSale: boolean | null;
  ecommerceAvailable: boolean | null;
  marketplaceAvailable: boolean | null;
  taxInfo: Record<string, unknown>;
  commercialInfo: Record<string, unknown>;
  logisticsInfo: Record<string, unknown>;
  suppliers: unknown[];
  gradeAttributes: unknown[];
  isActive: boolean;
  imageUrls: string[];
  rawPayload?: unknown;
};

export type IntegrationSyncConnectionContext = {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  accessTokenEncrypted: string | null;
  refreshTokenEncrypted: string | null;
};

export type IntegrationSyncStats = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  imagesCreated?: number;
  pageSize?: number;
  maxItems?: number;
  batchSize?: number;
  errors?: Array<{
    externalId?: string | null;
    externalCode?: string | null;
    message: string;
  }>;
};

export type IntegrationSyncContext = {
  brandId: string;
  connection: IntegrationSyncConnectionContext;
  resource: IntegrationSyncResource;
  mode: IntegrationSyncJobMode;
};

export type IntegrationProviderAdapter = {
  descriptor: IntegrationProviderDescriptor;
  getAuthorizationUrl?: (state: string) => Promise<string>;
  exchangeCode?: (code: string) => Promise<IntegrationAuthTokens>;
  syncProducts?: (context: IntegrationSyncContext) => Promise<IntegrationSyncStats>;
  syncCategories?: (context: IntegrationSyncContext) => Promise<IntegrationSyncStats>;
  handleWebhook?: (payload: unknown) => Promise<void>;
};

export function isIntegrationProviderName(
  value: string,
): value is IntegrationProviderName {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}
import type {
  IntegrationConnectionStatus,
  IntegrationProvider,
  IntegrationSyncJobMode,
  IntegrationSyncResource,
} from "@prisma/client";
