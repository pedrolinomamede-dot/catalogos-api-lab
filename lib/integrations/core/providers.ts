import type {
  IntegrationProviderAdapter,
  IntegrationProviderDescriptor,
  IntegrationProviderName,
} from "@/lib/integrations/core/types";
import {
  exchangeVarejonlineCode,
  getVarejonlineAuthorizationUrl,
  isVarejonlineConfigured,
} from "@/lib/integrations/providers/varejonline/auth";

const baseDescriptors: Record<IntegrationProviderName, Omit<IntegrationProviderDescriptor, "configured">> = {
  VAREJONLINE: {
    provider: "VAREJONLINE",
    label: "Varejonline",
    supportsOauth: true,
    supportsWebhook: false,
    supportsSync: false,
    capabilities: {
      products: true,
      categories: true,
      images: true,
      stock: true,
      price: true,
    },
  },
  OMIE: {
    provider: "OMIE",
    label: "Omie",
    supportsOauth: false,
    supportsWebhook: false,
    supportsSync: false,
    capabilities: {
      products: false,
      categories: false,
      images: false,
      stock: false,
      price: false,
    },
  },
  TINY: {
    provider: "TINY",
    label: "Tiny",
    supportsOauth: false,
    supportsWebhook: false,
    supportsSync: false,
    capabilities: {
      products: false,
      categories: false,
      images: false,
      stock: false,
      price: false,
    },
  },
  BLING: {
    provider: "BLING",
    label: "Bling",
    supportsOauth: false,
    supportsWebhook: false,
    supportsSync: false,
    capabilities: {
      products: false,
      categories: false,
      images: false,
      stock: false,
      price: false,
    },
  },
  CUSTOM: {
    provider: "CUSTOM",
    label: "Custom",
    supportsOauth: false,
    supportsWebhook: false,
    supportsSync: false,
    capabilities: {
      products: false,
      categories: false,
      images: false,
      stock: false,
      price: false,
    },
  },
};

const registry: Record<IntegrationProviderName, IntegrationProviderAdapter> = {
  VAREJONLINE: {
    descriptor: {
      ...baseDescriptors.VAREJONLINE,
      configured: isVarejonlineConfigured(),
    },
    getAuthorizationUrl: getVarejonlineAuthorizationUrl,
    exchangeCode: exchangeVarejonlineCode,
  },
  OMIE: {
    descriptor: { ...baseDescriptors.OMIE, configured: false },
  },
  TINY: {
    descriptor: { ...baseDescriptors.TINY, configured: false },
  },
  BLING: {
    descriptor: { ...baseDescriptors.BLING, configured: false },
  },
  CUSTOM: {
    descriptor: { ...baseDescriptors.CUSTOM, configured: false },
  },
};

export function listIntegrationProviders() {
  return Object.values(registry).map((adapter) => adapter.descriptor);
}

export function getIntegrationProvider(provider: IntegrationProviderName) {
  return registry[provider];
}
