"use client";

import { useCallback, useEffect, useState } from "react";
import { ImagePlus, MoveDown, MoveUp, Trash2 } from "lucide-react";

import type { ProductImage } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/ui/toast";

export type ImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
};

type ImageManagerProps = {
  initialImages?: ProductImage[];
  onDraftChange?: (drafts: ImageDraft[]) => void;
  onDeletePersisted?: (image: ProductImage) => Promise<void>;
  onReorderPersisted?: (images: ProductImage[]) => Promise<void>;
  reorderDisabledReason?: string;
};

export function ImageManager({
  initialImages = [],
  onDraftChange,
  onDeletePersisted,
  onReorderPersisted,
  reorderDisabledReason,
}: ImageManagerProps) {
  const [persistedImages, setPersistedImages] =
    useState<ProductImage[]>(initialImages);
  const [drafts, setDrafts] = useState<ImageDraft[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isOrderDirty, setIsOrderDirty] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const revokeImage = useCallback((image: ImageDraft) => {
    URL.revokeObjectURL(image.previewUrl);
  }, []);

  useEffect(() => {
    setPersistedImages((current) => {
      const currentIds = current.map((image) => image.id).join("|");
      const nextIds = initialImages.map((image) => image.id).join("|");
      if (currentIds === nextIds) {
        return current;
      }
      return initialImages;
    });
    setIsOrderDirty(false);
  }, [initialImages]);

  useEffect(() => {
    onDraftChange?.(drafts);
  }, [drafts, onDraftChange]);

  useEffect(() => {
    return () => {
      drafts.forEach((image) => revokeImage(image));
    };
  }, [drafts, revokeImage]);

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const next = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
        .toString(16)
        .slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setDrafts((current) => [...current, ...next]);
  };

  const handleRemoveDraft = (id: string) => {
    setDrafts((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        revokeImage(target);
      }
      return current.filter((image) => image.id !== id);
    });
  };

  const handleRemovePersisted = async (image: ProductImage) => {
    if (!onDeletePersisted) {
      return;
    }
    try {
      setDeletingId(image.id);
      await onDeletePersisted(image);
      setPersistedImages((current) =>
        current.filter((item) => item.id !== image.id),
      );
      setIsOrderDirty(false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMovePersisted = (index: number, direction: -1 | 1) => {
    setPersistedImages((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      setIsOrderDirty(true);
      return next;
    });
  };

  const handleMoveDraft = (index: number, direction: -1 | 1) => {
    setDrafts((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handleSaveOrder = async () => {
    if (!onReorderPersisted || !isOrderDirty) {
      return;
    }
    try {
      setIsSavingOrder(true);
      await onReorderPersisted(persistedImages);
      setIsOrderDirty(false);
      toastSuccess("Ordem das imagens atualizada");
    } catch {
      toastError("Não foi possível reordenar imagens", "Tente novamente.");
    } finally {
      setIsSavingOrder(false);
    }
  };

  const shouldShowReorderAction =
    Boolean(onReorderPersisted) || Boolean(reorderDisabledReason);
  const isReorderDisabled =
    !onReorderPersisted ||
    isSavingOrder ||
    !isOrderDirty ||
    persistedImages.length < 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Imagens</h3>
          <p className="text-xs text-muted-foreground">
            Adicione imagens locais para enviar no salvamento do produto.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shouldShowReorderAction ? (
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSaveOrder}
                disabled={isReorderDisabled}
              >
                {isSavingOrder ? "Salvando..." : "Salvar ordem"}
              </Button>
              {reorderDisabledReason ? (
                <span className="text-[11px] text-muted-foreground">
                  {reorderDisabledReason}
                </span>
              ) : null}
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <ImagePlus className="h-4 w-4" />
              Selecionar imagens
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleAddFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </Button>
        </div>
      </div>

      {persistedImages.length === 0 && drafts.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Nenhuma imagem adicionada.
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {persistedImages.map((image, index) => (
          <Card key={image.id} className="space-y-2 p-3">
            <div className="aspect-video overflow-hidden rounded-md bg-muted">
              <img
                src={image.thumbnailUrl ?? image.imageUrl}
                alt={image.altText ?? "Imagem do produto"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {image.altText ?? "Imagem enviada"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMovePersisted(index, -1)}
                  disabled={index === 0 || isSavingOrder}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMovePersisted(index, 1)}
                  disabled={index === persistedImages.length - 1 || isSavingOrder}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={deletingId === image.id || isSavingOrder}
                onClick={() => handleRemovePersisted(image)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
        {drafts.map((image, index) => (
          <Card key={image.id} className="space-y-2 p-3">
            <div className="aspect-video overflow-hidden rounded-md bg-muted">
              <img
                src={image.previewUrl}
                alt={image.file.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{image.file.name}</span>
              <span>{Math.round(image.file.size / 1024)}kb</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveDraft(index, -1)}
                  disabled={index === 0}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveDraft(index, 1)}
                  disabled={index === drafts.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveDraft(image.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
