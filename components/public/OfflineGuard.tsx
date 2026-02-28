"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type OfflineGuardProps = {
  brandSlug: string;
  page?: number;
  pageSize?: number;
};

const PUBLIC_API_CACHE = "public-api-v1";

const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

const getSnapshot = () =>
  typeof navigator !== "undefined" ? navigator.onLine : true;

const getServerSnapshot = () => true;

const buildProductsUrl = (brandSlug: string, page: number, pageSize: number) => {
  const params = new URLSearchParams({
    brandSlug,
    page: String(page),
    pageSize: String(pageSize),
  });
  return `/api/public/products?${params.toString()}`;
};

export function OfflineGuard({
  brandSlug,
  page = 1,
  pageSize = 12,
}: OfflineGuardProps) {
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const isOffline = !isOnline;
  const [isReady, setIsReady] = useState(false);
  const [hasRequiredCache, setHasRequiredCache] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkCache = async () => {
      if (!isOffline) {
        if (!cancelled) {
          setHasRequiredCache(true);
          setIsReady(false);
        }
        return;
      }

      if (!("caches" in window)) {
        if (!cancelled) {
          setHasRequiredCache(false);
          setIsReady(true);
        }
        return;
      }

      const encodedSlug = encodeURIComponent(brandSlug);
      const urls = [
        `/api/public/brands/${encodedSlug}`,
        `/api/public/categories?brandSlug=${encodedSlug}`,
        buildProductsUrl(brandSlug, page, pageSize),
      ];

      const cache = await caches.open(PUBLIC_API_CACHE);
      const matches = await Promise.all(urls.map((url) => cache.match(url)));
      const hasAll = matches.every(Boolean);

      if (!cancelled) {
        setHasRequiredCache(hasAll);
        setIsReady(true);
      }
    };

    void checkCache();

    return () => {
      cancelled = true;
    };
  }, [brandSlug, isOffline, page, pageSize]);

  if (!isOffline || !isReady || hasRequiredCache) {
    return null;
  }

  return (
    <div
      role="alert"
      style={{
        marginBottom: "16px",
        padding: "16px",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        background: "#ffffff",
        color: "#0f172a",
        fontSize: "14px",
      }}
    >
      <strong style={{ display: "block", marginBottom: "6px" }}>
        Primeiro acesso requer internet para baixar o catálogo.
      </strong>
      <span>Conecte-se e recarregue esta página.</span>
    </div>
  );
}
