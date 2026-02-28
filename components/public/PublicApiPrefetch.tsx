"use client";

import { useEffect, useRef } from "react";

type PublicApiPrefetchProps = {
  brandSlug: string;
  page?: number;
  pageSize?: number;
};

const buildProductsUrl = (brandSlug: string, page: number, pageSize: number) => {
  const params = new URLSearchParams({
    brandSlug,
    page: String(page),
    pageSize: String(pageSize),
  });
  return `/api/public/products?${params.toString()}`;
};

export function PublicApiPrefetch({
  brandSlug,
  page = 1,
  pageSize = 12,
}: PublicApiPrefetchProps) {
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (!brandSlug) {
      return;
    }

    if (hasPrefetched.current) {
      return;
    }
    hasPrefetched.current = true;

    const encodedSlug = encodeURIComponent(brandSlug);
    const endpoints = [
      `/api/public/brands/${encodedSlug}`,
      `/api/public/categories?brandSlug=${encodedSlug}`,
      buildProductsUrl(brandSlug, page, pageSize),
    ];

    void Promise.all(
      endpoints.map((endpoint) =>
        fetch(endpoint, { cache: "no-store" }).catch(() => null),
      ),
    );
  }, [brandSlug, page, pageSize]);

  return null;
}
