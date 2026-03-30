import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { formatBRL } from "@/lib/format";
import { getBaseUrl } from "@/lib/server-url";
import { PublicApiPrefetch } from "@/components/public/PublicApiPrefetch";
import { OfflineBanner } from "@/components/public/OfflineBanner";
import { OfflineGuard } from "@/components/public/OfflineGuard";

import { SearchBar } from "./search-bar";
import styles from "./catalog.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  params: Promise<{
    brandSlug: string;
  }>;
  searchParams?: Promise<SearchParams>;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
};

type ProductImage = {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
};

type ProductVariation = {
  id: string;
  variantType?: string | null;
  variantValue?: string | null;
  price: number;
  stockQuantity: number | null;
  images: ProductImage[];
};

type Product = {
  id: string;
  name: string;
  sku: string;
  category: Category | null;
  variations: ProductVariation[];
};

type ProductsResponse = {
  ok: true;
  data: {
    items: Product[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type BrandResponse = {
  ok: true;
  data: Brand;
};

type CategoriesResponse = {
  ok: true;
  data: Category[];
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }
  return { response, data };
}

function normalizeSearchParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function toPositiveInt(
  value: string | string[] | undefined,
  fallback: number,
  max?: number,
) {
  const parsed = Number.parseInt(
    typeof value === "string" ? value : "",
    10,
  );
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  if (typeof max === "number") {
    return Math.min(parsed, max);
  }
  return parsed;
}

function buildHref(base: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function findFirstImage(variations: ProductVariation[]) {
  for (const variation of variations) {
    if (variation.images?.length) {
      return variation.images[0];
    }
  }
  return null;
}

export default async function BrandCatalogPage({
  params,
  searchParams,
}: PageProps) {
  const { brandSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const query = normalizeSearchParam(sp.q);
  const categoryId = normalizeSearchParam(sp.categoryId) || undefined;
  const page = toPositiveInt(sp.page, 1);
  const pageSize = toPositiveInt(sp.pageSize, 12, 50);

  const baseUrl = await getBaseUrl();
  const brandUrl = `${baseUrl}/api/public/brands/${encodeURIComponent(
    brandSlug,
  )}`;
  const categoriesUrl = `${baseUrl}/api/public/categories?brandSlug=${encodeURIComponent(
    brandSlug,
  )}`;
  const productParams = new URLSearchParams({
    brandSlug,
    page: String(page),
    pageSize: String(pageSize),
  });

  if (query) {
    productParams.set("q", query);
  }
  if (categoryId) {
    productParams.set("categoryId", categoryId);
  }

  const productsUrl = `${baseUrl}/api/public/products?${productParams.toString()}`;

  const [brandResult, categoriesResult, productsResult] = await Promise.all([
    fetchJson<BrandResponse>(brandUrl),
    fetchJson<CategoriesResponse>(categoriesUrl),
    fetchJson<ProductsResponse>(productsUrl),
  ]);

  if (!brandResult.response.ok) {
    if (brandResult.response.status === 404) {
      notFound();
    }
    throw new Error("Failed to load brand");
  }

  if (!categoriesResult.response.ok || !productsResult.response.ok) {
    throw new Error("Failed to load catalog");
  }

  const brand = brandResult.data?.data;
  const categories = categoriesResult.data?.data ?? [];
  const productsData = productsResult.data?.data;

  if (!brand || !productsData) {
    throw new Error("Invalid catalog response");
  }

  const totalPages = Math.max(productsData.totalPages, 1);
  const currentPage = productsData.page;
  const totalItems = productsData.total;

  const baseParams = new URLSearchParams();
  if (query) {
    baseParams.set("q", query);
  }
  if (categoryId) {
    baseParams.set("categoryId", categoryId);
  }
  if (pageSize !== 12) {
    baseParams.set("pageSize", String(pageSize));
  }

  const buildCategoryLink = (id?: string) => {
    const params = new URLSearchParams(baseParams);
    if (id) {
      params.set("categoryId", id);
    } else {
      params.delete("categoryId");
    }
    params.set("page", "1");
    return buildHref(`/${brandSlug}`, params);
  };

  const buildPageLink = (targetPage: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(targetPage));
    return buildHref(`/${brandSlug}`, params);
  };

  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <PublicApiPrefetch brandSlug={brandSlug} />
        <OfflineBanner />
        <OfflineGuard brandSlug={brandSlug} />
      </Suspense>
      <section className={styles.hero}>
        <div>
          <div className={styles.kicker}>Catalogo publico</div>
          <h1 className={styles.brandTitle}>{brand.name}</h1>
          <p className={styles.subtitle}>
            {totalItems} item{totalItems === 1 ? "" : "s"} encontrado
            {totalItems === 1 ? "" : "s"}
          </p>
        </div>
        <Suspense fallback={<div>Carregando...</div>}>
          <SearchBar initialQuery={query} />
        </Suspense>
      </section>

      <nav className={styles.categories} aria-label="Categorias">
        <Link
          className={`${styles.categoryPill} ${
            !categoryId ? styles.categoryPillActive : ""
          }`}
          href={buildCategoryLink()}
        >
          Todas
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            className={`${styles.categoryPill} ${
              categoryId === category.id ? styles.categoryPillActive : ""
            }`}
            href={buildCategoryLink(category.id)}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      {productsData.items.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhum produto encontrado para este filtro.
        </div>
      ) : (
        <section className={styles.grid}>
          {productsData.items.map((product, index) => {
            const image = findFirstImage(product.variations);
            const primaryVariation = product.variations[0];
            const priceLabel = primaryVariation
              ? formatBRL(primaryVariation.price)
              : "Sem preco";
            const meta = [
              product.category?.name ?? "Sem categoria",
              product.sku ? `SKU ${product.sku}` : null,
            ]
              .filter(Boolean)
              .join(" | ");

            return (
              <Link
                key={product.id}
                href={`/${brandSlug}/products/${product.id}`}
                className={styles.card}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className={styles.cardMedia}>
                  {image ? (
                    <img
                      src={image.thumbnailUrl ?? image.imageUrl}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <span>Sem imagem</span>
                  )}
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardTitle}>{product.name}</div>
                  {meta ? (
                    <div className={styles.cardMeta}>{meta}</div>
                  ) : null}
                  <div className={styles.cardPrice}>{priceLabel}</div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <div className={styles.pagination}>
        {currentPage > 1 ? (
          <Link className={styles.pageLink} href={buildPageLink(currentPage - 1)}>
            Anterior
          </Link>
        ) : (
          <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`}>
            Anterior
          </span>
        )}
        <span className={styles.pageIndicator}>
          Pagina {currentPage} de {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link className={styles.pageLink} href={buildPageLink(currentPage + 1)}>
            Proxima
          </Link>
        ) : (
          <span className={`${styles.pageLink} ${styles.pageLinkDisabled}`}>
            Proxima
          </span>
        )}
      </div>
    </div>
  );
}
