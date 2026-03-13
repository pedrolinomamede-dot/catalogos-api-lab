export type ProductRowColumns = 4 | 5;

export type ProductRowCandidate = {
  imageAspectRatio?: number | null;
};

export type ProductRowModel<T> = {
  columns: ProductRowColumns;
  products: T[];
};

const WIDE_IMAGE_ASPECT_RATIO = 1.18;

function prefersFourPerRow(product: ProductRowCandidate) {
  return typeof product.imageAspectRatio === "number" && product.imageAspectRatio >= WIDE_IMAGE_ASPECT_RATIO;
}

export function chunkProductsForPdfRows<T extends ProductRowCandidate>(
  products: T[],
): Array<ProductRowModel<T>> {
  const rows: Array<ProductRowModel<T>> = [];

  for (let index = 0; index < products.length; ) {
    const remaining = products.length - index;
    const candidateWindow = products.slice(index, index + 5);
    const columns: ProductRowColumns =
      remaining >= 5 && candidateWindow.some(prefersFourPerRow) ? 4 : 5;
    const rowProducts = products.slice(index, index + Math.min(columns, remaining));

    rows.push({
      columns,
      products: rowProducts,
    });

    index += rowProducts.length;
  }

  return rows;
}
