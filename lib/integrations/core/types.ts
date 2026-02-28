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

export type NormalizedExternalProduct = {
  externalId: string;
  externalCode: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  barcode: string | null;
  size: string | null;
  categoryExternalId: string | null;
  categoryName: string | null;
  subcategoryExternalId: string | null;
  subcategoryName: string | null;
  price: number | null;
  stockQuantity: number | null;
  isActive: boolean;
  imageUrls: string[];
  rawPayload?: unknown;
};

export type IntegrationProviderAdapter = {
  descriptor: IntegrationProviderDescriptor;
  getAuthorizationUrl?: (state: string) => Promise<string>;
  exchangeCode?: (code: string) => Promise<IntegrationAuthTokens>;
  syncProducts?: () => Promise<void>;
  syncCategories?: () => Promise<void>;
  handleWebhook?: (payload: unknown) => Promise<void>;
};

export function isIntegrationProviderName(
  value: string,
): value is IntegrationProviderName {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}
