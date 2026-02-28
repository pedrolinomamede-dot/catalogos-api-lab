type VariationWithImages = {
  price: unknown;
  images?: unknown[];
  [key: string]: unknown;
};

type ProductWithVariations = {
  variations?: VariationWithImages[];
  [key: string]: unknown;
};

export function serializeVariation<T extends VariationWithImages>(variation: T) {
  const priceValue =
    typeof variation.price === "number"
      ? variation.price
      : Number(variation.price);

  return {
    ...variation,
    price: Number.isFinite(priceValue) ? priceValue : 0,
  };
}

export function serializeProduct<T extends ProductWithVariations>(product: T) {
  if (!product.variations) {
    return product;
  }

  return {
    ...product,
    variations: product.variations.map((variation) =>
      serializeVariation(variation),
    ),
  };
}
