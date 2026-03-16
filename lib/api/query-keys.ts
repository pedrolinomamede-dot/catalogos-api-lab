export const queryKeys = {
  me: ["me"] as const,
  brands: {
    all: ["brands"] as const,
    byId: (id: string) => ["brands", id] as const,
  },
  categories: {
    all: ["categories"] as const,
    byId: (id: string) => ["categories", id] as const,
  },
  products: {
    all: (paramsKey?: unknown) =>
      ["products", paramsKey ?? "all"] as const,
    byId: (id: string) => ["products", id] as const,
  },
  publicBrand: {
    bySlug: (slug: string) => ["public-brand", slug] as const,
  },
  publicCategories: {
    list: (brandSlug: string) => ["public-categories", brandSlug] as const,
  },
  publicProducts: {
    list: (params: Record<string, unknown>) =>
      ["public-products", params] as const,
    byId: (id: string, brandSlug?: string) =>
      ["public-product", id, brandSlug] as const,
  },
  v2: {
    baseProducts: {
      root: ["v2", "base-products"] as const,
      list: (paramsKey?: unknown) =>
        ["v2", "base-products", paramsKey ?? "all"] as const,
    },
    categories: {
      root: ["v2", "categories"] as const,
      list: (paramsKey?: unknown) =>
        ["v2", "categories", paramsKey ?? "all"] as const,
    },
    subcategories: {
      list: (categoryId: string, paramsKey?: unknown) =>
        ["v2", "subcategories", categoryId, paramsKey ?? "all"] as const,
    },
    catalogs: {
      root: ["v2", "catalogs"] as const,
      byId: (id: string) => ["v2", "catalogs", id] as const,
      list: (paramsKey?: unknown) =>
        ["v2", "catalogs", paramsKey ?? "all"] as const,
    },
    catalogItems: {
      list: (catalogId: string) => ["v2", "catalog-items", catalogId] as const,
    },
    shareLinks: {
      root: ["v2", "share-links"] as const,
      list: (paramsKey?: unknown) =>
        ["v2", "share-links", paramsKey ?? "all"] as const,
      byId: (id: string) => ["v2", "share-links", id] as const,
    },
    dashboard: {
      root: ["v2", "dashboard"] as const,
      summary: ["v2", "dashboard", "summary"] as const,
    },
    integrations: {
      root: ["v2", "integrations"] as const,
      providers: ["v2", "integrations", "providers"] as const,
      connections: ["v2", "integrations", "connections"] as const,
      connectionById: (id: string) => ["v2", "integrations", "connections", id] as const,
      jobs: (id: string, paramsKey?: unknown) =>
        ["v2", "integrations", "connections", id, "jobs", paramsKey ?? "all"] as const,
    },
  },
};



