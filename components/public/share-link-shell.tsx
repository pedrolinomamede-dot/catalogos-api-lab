"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { ShareLinkPublicCatalogV2, ShareLinkPublicV2 } from "@/types/api";

import { OfflineBanner } from "@/components/public/OfflineBanner";
import { Input } from "@/components/ui/input";
import { normalizeCatalogLabel } from "@/lib/catalog/line-grouping";
import {
  getDefaultProductCardTone,
  resolveProductCardTone,
  type ProductCardTone,
} from "@/lib/ui/product-card-tone";

type LightboxState = {
  images: string[];
  activeIndex: number;
  productName: string;
} | null;

export type PublicBrandInfo = {
  name: string;
  logoUrl?: string | null;
};

export type PublicCategoryInfo = {
  id: string;
  name: string;
};

export type PublicSubcategoryInfo = {
  id: string;
  name: string;
  categoryId: string;
};

export type ShareLinkProduct = {
  id: string;
  name: string;
  sku?: string | null;
  lineLabel?: string | null;
  sizeLabel?: string | null;
  barcode?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  galleryImageUrls?: string[];
  categoryId?: string | null;
  subcategoryId?: string | null;
  catalogId: string;
};

type ShareLinkShellProps = {
  shareLink: ShareLinkPublicV2;
  brand: PublicBrandInfo;
  categories: PublicCategoryInfo[];
  subcategories: PublicSubcategoryInfo[];
  productsByCatalog: Record<string, ShareLinkProduct[]>;
};

type SearchResult = {
  catalog: ShareLinkPublicCatalogV2;
  product: ShareLinkProduct;
};

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().trim();

const ALL_OPTION = "all";

type FilterValue = typeof ALL_OPTION | string;

export function ShareLinkShell({
  shareLink,
  brand,
  categories,
  subcategories,
  productsByCatalog,
}: ShareLinkShellProps) {
  const [activeCatalogId, setActiveCatalogId] = useState(
    shareLink.catalogs[0]?.id ?? "",
  );
  const [activeCategoryId, setActiveCategoryId] = useState<FilterValue>(ALL_OPTION);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<FilterValue>(ALL_OPTION);
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [cardTonesByProductId, setCardTonesByProductId] = useState<
    Record<string, ProductCardTone>
  >({});

  const closeLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  const goToImage = useCallback((index: number) => {
    setLightbox((current) => {
      if (!current || current.images.length === 0) {
        return current;
      }
      const boundedIndex =
        ((index % current.images.length) + current.images.length) %
        current.images.length;
      return {
        ...current,
        activeIndex: boundedIndex,
      };
    });
  }, []);

  const goToPreviousImage = useCallback(() => {
    setLightbox((current) => {
      if (!current || current.images.length === 0) {
        return current;
      }
      const nextIndex =
        (current.activeIndex - 1 + current.images.length) % current.images.length;
      return {
        ...current,
        activeIndex: nextIndex,
      };
    });
  }, []);

  const goToNextImage = useCallback(() => {
    setLightbox((current) => {
      if (!current || current.images.length === 0) {
        return current;
      }
      const nextIndex = (current.activeIndex + 1) % current.images.length;
      return {
        ...current,
        activeIndex: nextIndex,
      };
    });
  }, []);

  const openProductLightbox = useCallback((product: ShareLinkProduct) => {
    const gallerySource =
      product.galleryImageUrls && product.galleryImageUrls.length > 0
        ? product.galleryImageUrls
        : product.imageUrl
          ? [product.imageUrl]
          : [];

    const gallery = gallerySource.filter(
      (url) => typeof url === "string" && url.trim().length > 0,
    );

    if (gallery.length === 0) {
      return;
    }

    const coverUrl = product.imageUrl ?? gallery[0];
    const coverIndex = gallery.findIndex((url) => url === coverUrl);

    setLightbox({
      images: gallery,
      activeIndex: coverIndex >= 0 ? coverIndex : 0,
      productName: product.name,
    });
  }, []);

  useEffect(() => {
    if (!lightbox) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
        return;
      }
      if (event.key === "ArrowLeft") {
        goToPreviousImage();
        return;
      }
      if (event.key === "ArrowRight") {
        goToNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeLightbox, goToNextImage, goToPreviousImage, lightbox]);

  const activeCatalog = useMemo(
    () => shareLink.catalogs.find((catalog) => catalog.id === activeCatalogId),
    [activeCatalogId, shareLink.catalogs],
  );

  const activeProducts = useMemo(
    () => productsByCatalog[activeCatalogId] ?? [],
    [productsByCatalog, activeCatalogId],
  );

  const allProducts = useMemo(
    () => Object.values(productsByCatalog).flat(),
    [productsByCatalog],
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(category.id, category.name);
    });
    return map;
  }, [categories]);

  const subcategoryMap = useMemo(() => {
    const map = new Map<string, PublicSubcategoryInfo>();
    subcategories.forEach((subcategory) => {
      map.set(subcategory.id, subcategory);
    });
    return map;
  }, [subcategories]);

  const categoriesForActiveCatalog = useMemo(() => {
    const ids = new Set(
      activeProducts
        .map((product) => product.categoryId)
        .filter((id): id is string => Boolean(id)),
    );
    return categories.filter((category) => ids.has(category.id));
  }, [activeProducts, categories]);

  const subcategoriesForActive = useMemo(() => {
    if (activeCategoryId === ALL_OPTION) {
      return [] as PublicSubcategoryInfo[];
    }
    const ids = new Set(
      activeProducts
        .filter((product) => product.categoryId === activeCategoryId)
        .map((product) => product.subcategoryId)
        .filter((id): id is string => Boolean(id)),
    );
    return subcategories.filter(
      (subcategory) =>
        subcategory.categoryId === activeCategoryId && ids.has(subcategory.id),
    );
  }, [activeCategoryId, activeProducts, subcategories]);

  const resolvedCategoryId = useMemo(() => {
    if (activeCategoryId === ALL_OPTION) {
      return ALL_OPTION;
    }
    const exists = categoriesForActiveCatalog.some(
      (category) => category.id === activeCategoryId,
    );
    return exists ? activeCategoryId : ALL_OPTION;
  }, [activeCategoryId, categoriesForActiveCatalog]);

  const resolvedSubcategoryId = useMemo(() => {
    if (resolvedCategoryId === ALL_OPTION) {
      return ALL_OPTION;
    }
    const exists = subcategoriesForActive.some(
      (subcategory) => subcategory.id === activeSubcategoryId,
    );
    return exists ? activeSubcategoryId : ALL_OPTION;
  }, [activeSubcategoryId, resolvedCategoryId, subcategoriesForActive]);

  const searchResults = useMemo(() => {
    const term = normalize(query);
    if (!term) {
      return [] as SearchResult[];
    }
    return allProducts
      .filter((product) => {
        const name = normalize(product.name);
        const sku = normalize(product.sku ?? "");
        return name.includes(term) || sku.includes(term);
      })
      .map((product) => {
        const catalog =
          shareLink.catalogs.find((item) => item.id === product.catalogId) ??
          shareLink.catalogs[0];
        return {
          catalog,
          product,
        };
      });
  }, [allProducts, query, shareLink.catalogs]);

  const visibleProducts = useMemo(() => {
    let list = activeProducts;
    if (resolvedCategoryId !== ALL_OPTION) {
      list = list.filter((product) => product.categoryId === resolvedCategoryId);
    }
    if (resolvedSubcategoryId !== ALL_OPTION) {
      list = list.filter((product) => product.subcategoryId === resolvedSubcategoryId);
    }
    const term = normalize(query);
    if (term) {
      list = list.filter((product) => {
        const name = normalize(product.name);
        const sku = normalize(product.sku ?? "");
        return name.includes(term) || sku.includes(term);
      });
    }
    return list;
  }, [activeProducts, resolvedCategoryId, resolvedSubcategoryId, query]);

  const visibleLineGroups = useMemo(() => {
    const groups = new Map<string, { lineLabel: string | null; products: ShareLinkProduct[] }>();

    visibleProducts.forEach((product) => {
      const lineLabel = normalizeCatalogLabel(product.lineLabel);
      const key = lineLabel ?? "__no_line__";
      if (!groups.has(key)) {
        groups.set(key, { lineLabel, products: [] });
      }
      groups.get(key)!.products.push(product);
    });

    return [...groups.values()];
  }, [visibleProducts]);

  useEffect(() => {
    let cancelled = false;

    const pending = visibleProducts.filter(
      (product) => product.imageUrl && !cardTonesByProductId[product.id],
    );

    if (pending.length === 0) {
      return undefined;
    }

    const warmCardTones = async () => {
      const nextBatch: Record<string, ProductCardTone> = {};

      for (const product of pending) {
        const tone = await resolveProductCardTone(product.imageUrl);
        if (cancelled) {
          return;
        }
        nextBatch[product.id] = tone;
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      if (cancelled || Object.keys(nextBatch).length === 0) {
        return;
      }

      setCardTonesByProductId((previous) => ({
        ...previous,
        ...nextBatch,
      }));
    };

    void warmCardTones();
    return () => {
      cancelled = true;
    };
  }, [visibleProducts, cardTonesByProductId]);

  const handleCatalogChange = (catalogId: string) => {
    setActiveCatalogId(catalogId);
    setActiveCategoryId(ALL_OPTION);
    setActiveSubcategoryId(ALL_OPTION);
  };

  const handleCategoryChange = (categoryId: FilterValue) => {
    setActiveCategoryId(categoryId);
    setActiveSubcategoryId(ALL_OPTION);
  };

  const handleSubcategoryChange = (subcategoryId: FilterValue) => {
    setActiveSubcategoryId(subcategoryId);
  };

  const handleResultClick = (result: SearchResult) => {
    setActiveCatalogId(result.catalog.id);
    setActiveCategoryId(result.product.categoryId ?? ALL_OPTION);
    setActiveSubcategoryId(result.product.subcategoryId ?? ALL_OPTION);
    requestAnimationFrame(() => {
      const element = document.getElementById(`product-${result.product.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const hasProducts = allProducts.length > 0;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #fff5fa 0%, #f7f9fd 44%, #f8fcff 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <OfflineBanner />

        <header className="relative overflow-hidden rounded-3xl border border-rose-100/80 bg-white/85 p-6 shadow-[0_24px_60px_rgba(168,91,132,0.16)] backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-rose-100/65 blur-3xl" />
            <div className="absolute right-8 top-2 h-44 w-44 rounded-full bg-sky-100/65 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-32 w-80 -translate-x-1/2 rounded-full bg-fuchsia-50/80 blur-2xl" />
          </div>

          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
              {brand.logoUrl ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-[0_8px_24px_rgba(96,44,76,0.14)]">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="64px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-rose-50 text-xs text-rose-500">
                  Logo
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-rose-600/80">
                  Catalogo compartilhado
                </p>
                <h1
                  className="text-3xl leading-tight text-slate-900"
                  style={{ fontFamily: "var(--font-editorial), serif" }}
                >
                  {brand.name}
                </h1>
                <p className="text-sm text-slate-600">{shareLink.name}</p>
              </div>
            </div>
          </div>

            <div className="grid gap-3">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou SKU"
                aria-label="Buscar por nome ou SKU"
                className="h-11 rounded-xl border-rose-100/80 bg-white/90 px-4 text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-rose-200"
              />

              {shareLink.catalogs.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {shareLink.catalogs.map((catalog) => (
                    <button
                      key={catalog.id}
                      type="button"
                      onClick={() => handleCatalogChange(catalog.id)}
                      className={
                        catalog.id === activeCatalogId
                          ? "rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm"
                          : "rounded-full border border-rose-100 bg-white/95 px-4 py-1.5 text-xs text-slate-600 transition-colors hover:bg-rose-50"
                      }
                    >
                      {catalog.name}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-rose-600/80">
                  Filtrar
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange(ALL_OPTION)}
                    className={
                      resolvedCategoryId === ALL_OPTION
                        ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                        : "rounded-full border border-rose-100 bg-white/95 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-rose-50"
                    }
                  >
                    Todos
                  </button>
                  {categoriesForActiveCatalog.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryChange(category.id)}
                      className={
                        category.id === resolvedCategoryId
                          ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-rose-100 bg-white/95 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-rose-50"
                      }
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {resolvedCategoryId !== ALL_OPTION && subcategoriesForActive.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubcategoryChange(ALL_OPTION)}
                      className={
                        resolvedSubcategoryId === ALL_OPTION
                          ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-rose-100 bg-white/95 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-rose-50"
                      }
                    >
                      Todas as subcategorias
                    </button>
                    {subcategoriesForActive.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        type="button"
                        onClick={() => handleSubcategoryChange(subcategory.id)}
                        className={
                          subcategory.id === resolvedSubcategoryId
                            ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                            : "rounded-full border border-rose-100 bg-white/95 px-3 py-1 text-xs text-slate-600 transition-colors hover:bg-rose-50"
                        }
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {query.trim() ? (
          <section className="rounded-2xl border border-rose-100 bg-white/95 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600/80">
              Resultados globais
            </p>
            {searchResults.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Nenhum produto encontrado.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {searchResults.map((result) => (
                  <li key={`${result.catalog.id}-${result.product.id}`}>
                    <button
                      type="button"
                      onClick={() => handleResultClick(result)}
                      className="flex w-full items-center justify-between rounded-xl border border-rose-100 px-3 py-2 text-left text-sm transition-colors hover:bg-rose-50/40"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {result.product.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.product.sku ?? "Sem SKU"} · {result.catalog.name}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">Ver</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <h2
              className="text-3xl text-slate-900"
              style={{ fontFamily: "var(--font-editorial), serif" }}
            >
              {activeCatalog?.name ?? "Catalogo"}
            </h2>
            {activeCatalog?.description ? (
              <p className="text-sm text-slate-500">
                {activeCatalog.description}
              </p>
            ) : null}
          </div>

          {!hasProducts ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white/90 p-8 text-center text-sm text-slate-500">
              Nenhum produto disponivel neste link.
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-white/90 p-8 text-center text-sm text-slate-500">
              Nenhum produto encontrado para os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-6">
              {visibleLineGroups.map((lineGroup) => (
                <div key={lineGroup.lineLabel ?? "__no_line__"} className="space-y-4">
                  {lineGroup.lineLabel ? (
                    <div className="space-y-2">
                      <h3
                        className="text-2xl text-slate-900"
                        style={{ fontFamily: "var(--font-editorial), serif" }}
                      >
                        {lineGroup.lineLabel}
                      </h3>
                      <div className="h-px w-full bg-rose-100" />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {lineGroup.products.map((product) => {
                const categoryName = product.categoryId
                  ? categoryMap.get(product.categoryId)
                  : null;
                const tone =
                  cardTonesByProductId[product.id] ?? getDefaultProductCardTone();

                return (
                  <article
                    key={product.id}
                    id={`product-${product.id}`}
                    className="overflow-hidden rounded-2xl border transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: tone.cardBg,
                      borderColor: tone.cardBorder,
                      boxShadow: tone.cardShadow,
                    }}
                  >
                    <div
                      className="relative h-40 w-full cursor-pointer p-2"
                      style={{ backgroundColor: tone.imagePanelBg }}
                      onClick={() => openProductLightbox(product)}
                    >
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="rounded-md bg-white object-contain hover:opacity-90 transition-opacity"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          Sem imagem
                        </div>
                      )}
                    </div>
                      <div className="space-y-2 p-4">
                        <div className="space-y-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                          {product.name}
                        </p>
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: tone.skuChipBg,
                            color: tone.skuChipText,
                            boxShadow: `inset 0 0 0 1px ${tone.skuChipRing}`,
                          }}
                        >
                          {product.sku ?? "Sem SKU"}
                        </span>
                        </div>
                        {categoryName ? (
                          <p className="text-xs text-slate-600">
                            {categoryName}
                          </p>
                        ) : null}
                        {product.description ? (
                          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {product.description}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Lightbox Modal */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
          {lightbox.images.length > 1 ? (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Imagem anterior"
              onClick={(event) => {
                event.stopPropagation();
                goToPreviousImage();
              }}
            >
              ‹
            </button>
          ) : null}
          {lightbox.images.length > 1 ? (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Proxima imagem"
              onClick={(event) => {
                event.stopPropagation();
                goToNextImage();
              }}
            >
              ›
            </button>
          ) : null}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightbox.images[lightbox.activeIndex]}
              alt={lightbox.productName}
              width={800}
              height={800}
              className="max-h-[90vh] w-auto object-contain"
              unoptimized
            />
            <p className="mt-2 text-center text-sm text-white">
              {lightbox.productName} · {lightbox.activeIndex + 1}/{lightbox.images.length}
            </p>
            {lightbox.images.length > 1 ? (
              <div className="mt-3 flex max-w-[90vw] gap-2 overflow-x-auto pb-1">
                {lightbox.images.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    aria-label={`Ir para imagem ${index + 1}`}
                    onClick={() => goToImage(index)}
                    className={
                      index === lightbox.activeIndex
                        ? "relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 border-white"
                        : "relative h-14 w-14 shrink-0 overflow-hidden rounded border border-white/40"
                    }
                  >
                    <Image
                      src={url}
                      alt={`${lightbox.productName} miniatura ${index + 1}`}
                      fill
                      sizes="56px"
                      className="bg-white object-contain"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
