"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingCart, X } from "lucide-react";

import type {
  CreatePublicAnalyticsEventRequest,
  CreatePublicOrderIntentRequest,
  ProductImageLayout,
  PublicAnalyticsEventName,
  ShareLinkPublicCatalogV2,
  ShareLinkPublicV2,
} from "@/types/api";

import { OfflineBanner } from "@/components/public/OfflineBanner";
import { Input } from "@/components/ui/input";
import { resolveProductImageLayout } from "@/lib/catalog/image-layout";
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
  price?: number | null;
  lineLabel?: string | null;
  sizeLabel?: string | null;
  imageLayout?: ProductImageLayout | null;
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

type CartState = Record<string, number>;

type CartItem = {
  product: ShareLinkProduct;
  quantity: number;
  catalogName: string;
  unitPrice: number | null;
  lineTotal: number | null;
};

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().trim();

const ALL_OPTION = "all";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type FilterValue = typeof ALL_OPTION | string;

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function normalizeWhatsappPhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeOptionalInput(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const PUBLIC_SESSION_KEY_STORAGE = "catalogo-facil-public-session-key";

function createPublicSessionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `public-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreatePublicSessionKey() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(PUBLIC_SESSION_KEY_STORAGE);
    if (stored && stored.trim().length > 0) {
      return stored;
    }

    const nextKey = createPublicSessionKey();
    window.localStorage.setItem(PUBLIC_SESSION_KEY_STORAGE, nextKey);
    return nextKey;
  } catch {
    return createPublicSessionKey();
  }
}

function getPublicTrackingContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  return {
    sessionKey: getOrCreatePublicSessionKey(),
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
    utmContent: url.searchParams.get("utm_content"),
    utmTerm: url.searchParams.get("utm_term"),
    referrer: document.referrer || null,
  };
}

async function sendPublicAnalyticsEvent(
  payload: CreatePublicAnalyticsEventRequest,
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify(payload);
  const endpoint = "/api/v2/analytics-events/public";

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(endpoint, blob)) {
        return;
      }
    }
  } catch {
    // Fall through to fetch.
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics failures must not block the public flow.
  }
}

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
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [cartByProductId, setCartByProductId] = useState<CartState>({});
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

  const productsById = useMemo(() => {
    const map = new Map<string, ShareLinkProduct>();
    allProducts.forEach((product) => {
      if (!map.has(product.id)) {
        map.set(product.id, product);
      }
    });
    return map;
  }, [allProducts]);

  const catalogsById = useMemo(() => {
    const map = new Map<string, ShareLinkPublicCatalogV2>();
    shareLink.catalogs.forEach((catalog) => {
      map.set(catalog.id, catalog);
    });
    return map;
  }, [shareLink.catalogs]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(`share-link-cart:${shareLink.id}`);
      if (!rawValue) {
        setCartByProductId({});
        return;
      }

      const parsed = JSON.parse(rawValue) as CartState;
      const nextState: CartState = {};

      Object.entries(parsed).forEach(([productId, quantity]) => {
        if (
          productsById.has(productId) &&
          Number.isFinite(quantity) &&
          quantity > 0
        ) {
          nextState[productId] = Math.floor(quantity);
        }
      });

      setCartByProductId(nextState);
    } catch {
      setCartByProductId({});
    }
  }, [productsById, shareLink.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storageKey = `share-link-cart:${shareLink.id}`;
    if (Object.keys(cartByProductId).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(cartByProductId));
  }, [cartByProductId, shareLink.id]);

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
  const normalizedWhatsappPhone = normalizeWhatsappPhone(shareLink.ownerWhatsappPhone);

  const trackAnalyticsEvent = useCallback(
    (
      eventName: PublicAnalyticsEventName,
      options?: {
        productBaseId?: string | null;
        orderIntentId?: string | null;
        metadataJson?: Record<string, unknown> | null;
      },
    ) => {
      const trackingContext = getPublicTrackingContext();
      if (!trackingContext?.sessionKey) {
        return;
      }

      void sendPublicAnalyticsEvent({
        channel: "SHARE_LINK",
        eventName,
        shareLinkId: shareLink.id,
        productBaseId: options?.productBaseId ?? null,
        orderIntentId: options?.orderIntentId ?? null,
        sessionKey: trackingContext.sessionKey,
        utmSource: trackingContext.utmSource,
        utmMedium: trackingContext.utmMedium,
        utmCampaign: trackingContext.utmCampaign,
        utmContent: trackingContext.utmContent,
        utmTerm: trackingContext.utmTerm,
        referrer: trackingContext.referrer,
        metadataJson: options?.metadataJson ?? null,
      });
    },
    [shareLink.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const viewedKey = `share-link-viewed:${shareLink.id}`;
    try {
      if (window.sessionStorage.getItem(viewedKey)) {
        return;
      }

      window.sessionStorage.setItem(viewedKey, "1");
    } catch {
      // Ignore storage issues and still attempt tracking once.
    }

    trackAnalyticsEvent("share_link_viewed", {
      metadataJson: {
        catalogCount: shareLink.catalogs.length,
        productCount: allProducts.length,
      },
    });
  }, [allProducts.length, shareLink.catalogs.length, shareLink.id, trackAnalyticsEvent]);

  const cartItems = useMemo(() => {
    return Object.entries(cartByProductId)
      .map(([productId, quantity]) => {
        const product = productsById.get(productId);
        if (!product || quantity <= 0) {
          return null;
        }

        const unitPrice = typeof product.price === "number" ? product.price : null;

        return {
          product,
          quantity,
          catalogName: catalogsById.get(product.catalogId)?.name ?? "Catalogo",
          unitPrice,
          lineTotal: unitPrice !== null ? unitPrice * quantity : null,
        } satisfies CartItem;
      })
      .filter((item): item is CartItem => Boolean(item));
  }, [cartByProductId, catalogsById, productsById]);

  const cartItemCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + (item.lineTotal ?? 0), 0),
    [cartItems],
  );

  const hasPricedItems = cartItems.some((item) => item.unitPrice !== null);
  const hasItemsWithoutPrice = cartItems.some((item) => item.unitPrice === null);

  const updateCartQuantity = useCallback(
    (productId: string, nextQuantity: number) => {
      setCartByProductId((current) => {
        if (nextQuantity <= 0) {
          const { [productId]: _removed, ...rest } = current;
          return rest;
        }

        return {
          ...current,
          [productId]: nextQuantity,
        };
      });

      if (nextQuantity > 0) {
        trackAnalyticsEvent("share_link_add_to_cart", {
          productBaseId: productId,
          metadataJson: {
            quantity: nextQuantity,
          },
        });
      }
    },
    [trackAnalyticsEvent],
  );

  const increaseQuantity = useCallback(
    (productId: string) => {
      const nextQuantity = (cartByProductId[productId] ?? 0) + 1;
      setCartByProductId((current) => ({
        ...current,
        [productId]: (current[productId] ?? 0) + 1,
      }));

      trackAnalyticsEvent("share_link_add_to_cart", {
        productBaseId: productId,
        metadataJson: {
          quantity: nextQuantity,
        },
      });
    },
    [cartByProductId, trackAnalyticsEvent],
  );

  const decreaseQuantity = useCallback(
    (productId: string) => {
      const currentQuantity = cartByProductId[productId] ?? 0;
      const nextQuantity = Math.max(currentQuantity - 1, 0);

      setCartByProductId((current) => {
        const stateQuantity = current[productId] ?? 0;
        if (stateQuantity <= 1) {
          const { [productId]: _removed, ...rest } = current;
          return rest;
        }

        return {
          ...current,
          [productId]: stateQuantity - 1,
        };
      });

      trackAnalyticsEvent("share_link_remove_from_cart", {
        productBaseId: productId,
        metadataJson: {
          quantity: nextQuantity,
        },
      });
    },
    [cartByProductId, trackAnalyticsEvent],
  );

  const clearCart = useCallback(() => {
    setCartByProductId({});
    setIsCartOpen(false);
    setCheckoutError(null);
  }, []);

  const handleCheckout = useCallback(async () => {
    if (
      cartItems.length === 0 ||
      !normalizedWhatsappPhone ||
      typeof window === "undefined" ||
      isCheckoutSubmitting
    ) {
      return;
    }

    setCheckoutError(null);
    setIsCheckoutSubmitting(true);

    const normalizedCustomerName = normalizeOptionalInput(customerName);
    const normalizedCustomerWhatsapp = normalizeOptionalInput(customerWhatsapp);
    const normalizedCustomerEmail = normalizeOptionalInput(customerEmail);

    const greetingTarget = shareLink.ownerName?.trim() || "vendedor";
    const itemLines = cartItems.flatMap((item, index) => {
      const details = [
        item.product.sku ? `SKU: ${item.product.sku}` : null,
        `Quantidade: ${item.quantity}`,
        item.catalogName ? `Catalogo: ${item.catalogName}` : null,
        item.unitPrice !== null ? `Valor unitario: ${formatCurrency(item.unitPrice)}` : null,
      ].filter(Boolean) as string[];

      return [`${index + 1}. ${item.product.name}`, ...details.map((detail) => `   ${detail}`)];
    });

    const subtotalLine = hasPricedItems
      ? hasItemsWithoutPrice
        ? `Subtotal parcial: ${formatCurrency(subtotal)} (alguns itens sem preco visivel)`
        : `Subtotal estimado: ${formatCurrency(subtotal)}`
      : null;

    const messageLines = [
      `Ola, ${greetingTarget}!`,
      `Tenho interesse nos produtos do catalogo "${shareLink.name}".`,
      ...((normalizedCustomerName || normalizedCustomerWhatsapp || normalizedCustomerEmail)
        ? [
            "",
            "Cliente:",
            ...(normalizedCustomerName ? [`Nome: ${normalizedCustomerName}`] : []),
            ...(normalizedCustomerWhatsapp
              ? [`WhatsApp: ${normalizedCustomerWhatsapp}`]
              : []),
            ...(normalizedCustomerEmail ? [`E-mail: ${normalizedCustomerEmail}`] : []),
          ]
        : []),
      "",
      "Itens:",
      ...itemLines,
      ...(subtotalLine ? ["", subtotalLine] : []),
      "",
      `Link do catalogo: ${window.location.href}`,
    ];

    const whatsappUrl = `https://wa.me/${normalizedWhatsappPhone}?text=${encodeURIComponent(
      messageLines.join("\n"),
    )}`;

    trackAnalyticsEvent("share_link_checkout_started", {
      metadataJson: {
        itemCount: cartItemCount,
        subtotal: hasPricedItems ? subtotal : null,
        hasItemsWithoutPrice,
        hasCustomerIdentification: Boolean(
          normalizedCustomerName ||
            normalizedCustomerWhatsapp ||
            normalizedCustomerEmail,
        ),
      },
    });

    try {
      const payload: CreatePublicOrderIntentRequest = {
        channel: "SHARE_LINK",
        shareLinkId: shareLink.id,
        items: cartItems.map((item) => ({
          catalogId: item.product.catalogId,
          productBaseId: item.product.id,
          quantity: item.quantity,
        })),
        customerName: normalizedCustomerName,
        customerWhatsapp: normalizedCustomerWhatsapp,
        customerEmail: normalizedCustomerEmail,
      };

      const response = await fetch("/api/v2/order-intents/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Nao foi possivel registrar seu pedido agora.";
        try {
          const errorPayload = (await response.json()) as {
            error?: { message?: string };
          };
          if (errorPayload.error?.message) {
            message = errorPayload.error.message;
          }
        } catch {
          // Ignore JSON parse issues and keep generic message.
        }

        setCheckoutError(message);
        return;
      }

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      clearCart();
    } catch {
      setCheckoutError("Nao foi possivel registrar seu pedido agora.");
    } finally {
      setIsCheckoutSubmitting(false);
    }
  }, [
    cartItems,
    clearCart,
    hasItemsWithoutPrice,
    hasPricedItems,
    isCheckoutSubmitting,
    normalizedWhatsappPhone,
    customerEmail,
    customerName,
    customerWhatsapp,
    shareLink.id,
    shareLink.name,
    shareLink.ownerName,
    subtotal,
    cartItemCount,
    trackAnalyticsEvent,
  ]);

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

              <div className="flex flex-wrap items-center justify-end gap-2">
                {shareLink.ownerName ? (
                  <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600">
                    Atendimento: {shareLink.ownerName}
                  </span>
                ) : null}
                <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-1 text-xs font-medium text-slate-600">
                  {normalizedWhatsappPhone
                    ? "Pedido via WhatsApp disponivel"
                    : "Pedido via WhatsApp indisponivel"}
                </span>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho {cartItemCount > 0 ? `(${cartItemCount})` : ""}
                </button>
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
                      const imageLayout = resolveProductImageLayout(
                        product.sizeLabel,
                        product.imageLayout,
                      );
                      const quantityInCart = cartByProductId[product.id] ?? 0;

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
                            {(() => {
                              return product.imageUrl ? (
                                <div
                                  className="absolute inset-0 flex items-center justify-center p-2"
                                >
                                  <div
                                    className="relative h-full w-full"
                                    style={{
                                      transform: `translate(${imageLayout.offsetX}%, ${imageLayout.offsetY}%) scale(${imageLayout.scale})`,
                                      transformOrigin: "center",
                                    }}
                                  >
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      sizes="(max-width: 768px) 100vw, 33vw"
                                      className="rounded-md bg-white object-contain hover:opacity-90 transition-opacity"
                                      unoptimized
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                  Sem imagem
                                </div>
                              );
                            })()}
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

                            <div className="flex items-center justify-between gap-3 pt-2">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {typeof product.price === "number"
                                    ? formatCurrency(product.price)
                                    : "Consultar valor"}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Pedido enviado por WhatsApp
                                </p>
                              </div>

                              {quantityInCart > 0 ? (
                                <div className="inline-flex items-center overflow-hidden rounded-full border border-rose-100 bg-white/90 shadow-sm">
                                  <button
                                    type="button"
                                    onClick={() => decreaseQuantity(product.id)}
                                    className="px-3 py-2 text-slate-600 transition-colors hover:bg-rose-50"
                                    aria-label={`Diminuir quantidade de ${product.name}`}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">
                                    {quantityInCart}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => increaseQuantity(product.id)}
                                    className="px-3 py-2 text-slate-600 transition-colors hover:bg-rose-50"
                                    aria-label={`Aumentar quantidade de ${product.name}`}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updateCartQuantity(product.id, 1)}
                                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  Adicionar
                                </button>
                              )}
                            </div>
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

      {cartItemCount > 0 ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex w-auto max-w-4xl items-center justify-between gap-3 rounded-2xl border border-rose-100/80 bg-white/95 px-4 py-3 shadow-[0_16px_40px_rgba(44,17,31,0.18)] backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {cartItemCount} {cartItemCount === 1 ? "item" : "itens"} no carrinho
            </p>
            <p className="text-xs text-slate-500">
              {hasPricedItems
                ? hasItemsWithoutPrice
                  ? `Subtotal parcial ${formatCurrency(subtotal)}`
                  : `Subtotal estimado ${formatCurrency(subtotal)}`
                : "Finalize o pedido no WhatsApp do vendedor"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Ver carrinho
          </button>
        </div>
      ) : null}

      {isCartOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/45 p-4 md:items-center"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(44,17,31,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rose-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600/80">
                  Carrinho
                </p>
                <h2
                  className="text-2xl text-slate-900"
                  style={{ fontFamily: "var(--font-editorial), serif" }}
                >
                  Finalize no WhatsApp
                </h2>
                <p className="text-sm text-slate-500">
                  {shareLink.ownerName
                    ? `Pedido enviado para ${shareLink.ownerName}`
                    : "Pedido enviado para o vendedor responsavel"}
                </p>
                {checkoutError ? (
                  <p className="mt-2 text-sm font-medium text-rose-600">
                    {checkoutError}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full bg-black/5 p-2 text-slate-600 transition-colors hover:bg-black/10"
                onClick={() => setIsCartOpen(false)}
                aria-label="Fechar carrinho"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {cartItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-center text-sm text-slate-500">
                  Seu carrinho esta vazio.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-rose-100 bg-white px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.product.sku ?? "Sem SKU"} · {item.catalogName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.unitPrice !== null
                          ? `${formatCurrency(item.unitPrice)} por unidade`
                          : "Preco nao exibido neste catalogo"}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="inline-flex items-center overflow-hidden rounded-full border border-rose-100 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.product.id)}
                          className="px-3 py-2 text-slate-600 transition-colors hover:bg-rose-50"
                          aria-label={`Diminuir quantidade de ${item.product.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-10 px-2 text-center text-sm font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.product.id)}
                          className="px-3 py-2 text-slate-600 transition-colors hover:bg-rose-50"
                          aria-label={`Aumentar quantidade de ${item.product.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {item.lineTotal !== null ? (
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}

              {cartItems.length > 0 ? (
                <div className="rounded-2xl border border-rose-100 bg-white p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Seus dados
                    </p>
                    <p className="text-xs text-slate-500">
                      Opcional. Se preencher, o vendedor recebe sua identificacao e o sistema
                      consegue reconhecer futuras interacoes.
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Seu nome"
                      aria-label="Seu nome"
                      className="h-11 rounded-xl border-rose-100/80 bg-white/90 px-4 text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-rose-200 sm:col-span-2"
                    />
                    <Input
                      value={customerWhatsapp}
                      onChange={(event) => setCustomerWhatsapp(event.target.value)}
                      placeholder="WhatsApp"
                      aria-label="WhatsApp"
                      className="h-11 rounded-xl border-rose-100/80 bg-white/90 px-4 text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-rose-200"
                    />
                    <Input
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="E-mail"
                      aria-label="E-mail"
                      type="email"
                      className="h-11 rounded-xl border-rose-100/80 bg-white/90 px-4 text-slate-700 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-rose-200"
                    />
                  </div>
                </div>
              ) : null}

              {cartItems.length > 0 ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">Resumo</p>
                  <p className="mt-1">
                    {cartItemCount} {cartItemCount === 1 ? "item" : "itens"} selecionados
                  </p>
                  {hasPricedItems ? (
                    <p className="mt-1">
                      {hasItemsWithoutPrice
                        ? `Subtotal parcial: ${formatCurrency(subtotal)}`
                        : `Subtotal estimado: ${formatCurrency(subtotal)}`}
                    </p>
                  ) : null}
                  {hasItemsWithoutPrice ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Alguns itens nao exibem preco e serao confirmados no atendimento.
                    </p>
                  ) : null}
                  {!normalizedWhatsappPhone ? (
                    <p className="mt-2 text-xs font-medium text-amber-700">
                      Este catalogo ainda nao possui um WhatsApp configurado para finalizar o pedido.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-rose-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="rounded-full border border-rose-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpar carrinho
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || !normalizedWhatsappPhone}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <MessageCircle className="h-4 w-4" />
                {isCheckoutSubmitting ? "Registrando pedido..." : "Finalizar no WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
