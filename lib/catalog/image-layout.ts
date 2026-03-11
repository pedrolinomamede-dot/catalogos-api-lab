import type { ProductImageLayout } from "@/types/api";

import { resolveProductImageScale } from "@/lib/catalog/image-size-band";

type ResolvedProductImageLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  trimApplied: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeProductImageLayout(
  value: ProductImageLayout | null | undefined,
): ProductImageLayout | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const zoom =
    typeof value.zoom === "number" && Number.isFinite(value.zoom)
      ? clamp(value.zoom, 0.75, 1.45)
      : null;
  const offsetX =
    typeof value.offsetX === "number" && Number.isFinite(value.offsetX)
      ? clamp(value.offsetX, -30, 30)
      : null;
  const offsetY =
    typeof value.offsetY === "number" && Number.isFinite(value.offsetY)
      ? clamp(value.offsetY, -30, 30)
      : null;
  const trimApplied =
    typeof value.trimApplied === "boolean" ? value.trimApplied : null;

  return {
    zoom,
    offsetX,
    offsetY,
    trimApplied,
  };
}

export function resolveProductImageLayout(
  sizeLabel?: string | null,
  imageLayout?: ProductImageLayout | null,
): ResolvedProductImageLayout {
  const normalizedLayout = normalizeProductImageLayout(imageLayout);
  const baseScale = resolveProductImageScale(sizeLabel);
  const zoom = normalizedLayout?.zoom ?? 1;

  return {
    scale: clamp(baseScale * zoom, 0.72, 1.05),
    offsetX: normalizedLayout?.offsetX ?? 0,
    offsetY: normalizedLayout?.offsetY ?? 0,
    trimApplied: normalizedLayout?.trimApplied ?? false,
  };
}
