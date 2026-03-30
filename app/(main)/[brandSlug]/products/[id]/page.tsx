import Link from "next/link";
import { notFound } from "next/navigation";

import { formatBRL } from "@/lib/format";
import { getBaseUrl } from "@/lib/server-url";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    brandSlug: string;
    id: string;
  }>;
};

type Category = {
  id: string;
  name: string;
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
  description?: string | null;
  category: Category | null;
  variations: ProductVariation[];
};

type ProductResponse = {
  ok: true;
  data: Product;
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

export default async function ProductDetailPage({ params }: PageProps) {
  const baseUrl = await getBaseUrl();
  const { brandSlug, id: productId } = await params;

  const url = `${baseUrl}/api/public/products/${encodeURIComponent(
    productId,
  )}?brandSlug=${encodeURIComponent(brandSlug)}`;

  const result = await fetchJson<ProductResponse>(url);

  if (!result.response.ok) {
    if (result.response.status === 404) {
      notFound();
    }
    throw new Error("Failed to load product");
  }

  const product = result.data?.data;
  if (!product) {
    throw new Error("Invalid product response");
  }

  const galleryItems = product.variations
    .flatMap((variation, variationIndex) =>
      (variation.images ?? []).map((image) => ({
        ...image,
        variationLabel:
          variation.variantValue ?? variation.variantType ?? "Variacao",
        variationIndex,
      })),
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.variationIndex - b.variationIndex;
    });

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href={`/${brandSlug}`}>
        &lt;- Voltar ao catalogo
      </Link>

      <div className={styles.layout}>
        <section className={styles.gallery}>
          {galleryItems.length === 0 ? (
            <div className={styles.imageCard}>
              <div className={styles.imagePlaceholder}>Sem imagem</div>
            </div>
          ) : (
            galleryItems.map((image, index) => (
              <div
                key={image.id}
                className={styles.imageCard}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <img
                  src={image.thumbnailUrl ?? image.imageUrl}
                  alt={`${product.name} ${image.variationLabel}`}
                  loading="lazy"
                />
              </div>
            ))
          )}
        </section>

        <aside className={styles.infoPanel}>
          <div>
            <div className={styles.sku}>{product.sku || "SKU n/a"}</div>
            <h1 className={styles.productTitle}>{product.name}</h1>
          </div>
          <span className={styles.categoryTag}>
            {product.category?.name ?? "Sem categoria"}
          </span>
          <p className={styles.description}>
            {product.description || "Descricao indisponivel."}
          </p>

          <div className={styles.variations}>
            {product.variations.length === 0 ? (
              <div className={styles.emptyNotice}>
                Nenhuma variacao disponivel.
              </div>
            ) : (
              product.variations.map((variation) => (
                <div key={variation.id} className={styles.variationCard}>
                  <div className={styles.variationHeader}>
                    <span className={styles.variationLabel}>
                      {variation.variantValue ??
                        variation.variantType ??
                        "Variacao"}
                    </span>
                    <span className={styles.variationPrice}>
                      {formatBRL(variation.price)}
                    </span>
                  </div>
                  <div className={styles.variationMeta}>
                    Estoque: {variation.stockQuantity ?? 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
