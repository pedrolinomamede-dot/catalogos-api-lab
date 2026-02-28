export type CatalogSnapshotGalleryItem = {
  imageUrl: string;
  sortOrder: number;
};

export type CatalogSnapshotAttributes = {
  size?: string | null;
};

export function parseCatalogSnapshotGallery(
  value: unknown,
): CatalogSnapshotGalleryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is CatalogSnapshotGalleryItem => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const record = item as Record<string, unknown>;
      return (
        typeof record.imageUrl === "string" &&
        typeof record.sortOrder === "number" &&
        Number.isFinite(record.sortOrder)
      );
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function parseCatalogSnapshotAttributes(
  value: unknown,
): CatalogSnapshotAttributes {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  return {
    size: typeof record.size === "string" ? record.size : null,
  };
}
