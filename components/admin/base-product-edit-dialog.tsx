"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { BaseProductV2, ProductBaseImageV2, ProductImageLayout } from "@/types/api";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImages } from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/error";
import {
  useAddBaseProductImageV2,
  useBaseProductImagesV2,
  useDeleteBaseProductImageV2,
  useUpdateBaseProductV2,
  useUpdateBaseProductImageV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BaseProductEditDialogProps = {
  open: boolean;
  baseProduct: BaseProductV2 | null;
  onOpenChange: (open: boolean) => void;
};

export function BaseProductEditDialog({
  open,
  baseProduct,
  onOpenChange,
}: BaseProductEditDialogProps) {
  const [imageLayout, setImageLayout] = useState<ProductImageLayout>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    trimApplied: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [productName, setProductName] = useState(baseProduct?.name ?? "");
  const [productLine, setProductLine] = useState(baseProduct?.line ?? "");
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(baseProduct?.imageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const updateBaseProductMutation = useUpdateBaseProductV2();
  const updateImageMutation = useUpdateBaseProductImageV2();
  
  const { data: galleryImages = [], isLoading: isLoadingGallery } = useBaseProductImagesV2(
    baseProduct?.id ?? "",
  );
  const addImageMutation = useAddBaseProductImageV2(baseProduct?.id ?? "");
  const deleteImageMutation = useDeleteBaseProductImageV2(baseProduct?.id ?? "");

  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setProductName(baseProduct?.name ?? "");
    setProductLine(baseProduct?.line ?? "");
    setMainImageUrl(baseProduct?.imageUrl ?? null);
    setImageLayout({
      zoom: baseProduct?.imageLayoutJson?.zoom ?? 1,
      offsetX: baseProduct?.imageLayoutJson?.offsetX ?? 0,
      offsetY: baseProduct?.imageLayoutJson?.offsetY ?? 0,
      trimApplied: baseProduct?.imageLayoutJson?.trimApplied ?? false,
    });
    if (!open) {
      setSelectedFile(null);
    }
  }, [baseProduct?.id, baseProduct?.name, baseProduct?.imageUrl, open]);

  const isSaving =
    isUploading ||
    updateBaseProductMutation.isPending ||
    updateImageMutation.isPending ||
    addImageMutation.isPending ||
    deleteImageMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSaving) {
      return;
    }
    if (!nextOpen) {
      setSelectedFile(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!baseProduct) {
      return;
    }

    if (!selectedFile) {
      toastError("Selecione uma imagem", "Escolha um arquivo para enviar.");
      return;
    }

    try {
      setIsUploading(true);
      const formPayload = new FormData();
      formPayload.append("files", selectedFile);
      const response = (await uploadImages(formPayload)) as {
        data?: Array<{ imageUrl: string }>;
      };
      const uploadedUrl = response?.data?.[0]?.imageUrl;
      if (!uploadedUrl) {
        toastError("Upload falhou", "Nao foi possivel obter a imagem enviada.");
        return;
      }

      // Add to gallery instead of replacing main image
      await addImageMutation.mutateAsync(uploadedUrl);

      if (!mainImageUrl) {
        setMainImageUrl(uploadedUrl);
      }

      toastSuccess("Imagem adicionada a galeria");
      setSelectedFile(null);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!baseProduct) {
      return;
    }

    const nextName = productName.trim();
    if (nextName.length < 2) {
      toastError("Nome invalido", "O nome precisa ter no minimo 2 caracteres.");
      return;
    }

    try {
      const updated = await updateBaseProductMutation.mutateAsync({
        id: baseProduct.id,
        data: {
          name: nextName,
          line: productLine.trim() || null,
          imageLayoutJson: imageLayout,
        },
      });
      setProductName(updated.name);
      setProductLine(updated.line ?? "");
      setImageLayout({
        zoom: updated.imageLayoutJson?.zoom ?? 1,
        offsetX: updated.imageLayoutJson?.offsetX ?? 0,
        offsetY: updated.imageLayoutJson?.offsetY ?? 0,
        trimApplied: updated.imageLayoutJson?.trimApplied ?? false,
      });
      toastSuccess("Produto atualizado");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    }
  };

  const handleRemoveMainImage = async () => {
    if (!baseProduct || !mainImageUrl) {
      return;
    }

    try {
      setIsUploading(true);
      const updated = await updateImageMutation.mutateAsync({
        id: baseProduct.id,
        imageUrl: null,
      });
      setMainImageUrl(updated.imageUrl ?? null);
      toastSuccess(
        updated.imageUrl
          ? "Imagem principal atualizada com a galeria"
          : "Imagem principal removida",
      );
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteGalleryImage = async (image: ProductBaseImageV2) => {
    try {
      await deleteImageMutation.mutateAsync(image.id);
      toastSuccess("Imagem removida da galeria");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    }
  };

  const handleSetAsMain = async (image: ProductBaseImageV2) => {
    if (!baseProduct) return;
    try {
      setIsUploading(true);
      const updated = await updateImageMutation.mutateAsync({
        id: baseProduct.id,
        imageUrl: image.imageUrl,
      });
      setMainImageUrl(updated.imageUrl ?? null);
      toastSuccess("Imagem definida como principal");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    } finally {
      setIsUploading(false);
    }
  };

  const zoomValue = Math.round((imageLayout.zoom ?? 1) * 100);
  const offsetXValue = Math.round(imageLayout.offsetX ?? 0);
  const offsetYValue = Math.round(imageLayout.offsetY ?? 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>
            Gerencie o nome e as imagens do produto da Base Geral.
          </DialogDescription>
        </DialogHeader>

        <form className="grid max-h-[60vh] gap-4 overflow-y-auto pr-2" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="base-product-name">Nome do produto</Label>
            <div className="flex gap-2">
              <Input
                id="base-product-name"
                value={productName}
                disabled={isSaving}
                onChange={(event) => setProductName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || productName.trim().length < 2}
                onClick={handleSaveMetadata}
              >
                Salvar dados
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="base-product-line">Linha (opcional)</Label>
            <Input
              id="base-product-line"
              value={productLine}
              disabled={isSaving}
              onChange={(event) => setProductLine(event.target.value)}
              placeholder="Ex.: Baby"
            />
          </div>

          <div className="grid gap-3">
            <Label>Ajuste da foto no catálogo</Label>
            <Card className="space-y-4 p-4">
              <div className="mx-auto h-40 w-40 overflow-hidden rounded-2xl border border-input bg-muted/30">
                {mainImageUrl ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <div
                      className="relative h-full w-full"
                      style={{
                        transform: `translate(${imageLayout.offsetX ?? 0}%, ${imageLayout.offsetY ?? 0}%) scale(${imageLayout.zoom ?? 1})`,
                        transformOrigin: "center",
                      }}
                    >
                      <img
                        src={mainImageUrl}
                        alt={productName || baseProduct?.name || "Preview da imagem"}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Defina uma imagem principal
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="base-product-image-zoom">Zoom {zoomValue}</Label>
                  <Input
                    id="base-product-image-zoom"
                    type="range"
                    min={0.75}
                    max={1.9}
                    step={0.01}
                    value={imageLayout.zoom ?? 1}
                    disabled={isSaving || !mainImageUrl}
                    onChange={(event) =>
                      setImageLayout((current) => ({
                        ...current,
                        zoom: Number.parseFloat(event.target.value),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="base-product-image-offset-x">
                    Posição horizontal {offsetXValue}
                  </Label>
                  <Input
                    id="base-product-image-offset-x"
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={imageLayout.offsetX ?? 0}
                    disabled={isSaving || !mainImageUrl}
                    onChange={(event) =>
                      setImageLayout((current) => ({
                        ...current,
                        offsetX: Number.parseInt(event.target.value, 10),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="base-product-image-offset-y">
                    Posição vertical {offsetYValue}
                  </Label>
                  <Input
                    id="base-product-image-offset-y"
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={imageLayout.offsetY ?? 0}
                    disabled={isSaving || !mainImageUrl}
                    onChange={(event) =>
                      setImageLayout((current) => ({
                        ...current,
                        offsetY: Number.parseInt(event.target.value, 10),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving || !mainImageUrl}
                  onClick={() =>
                    setImageLayout({
                      zoom: 1,
                      offsetX: 0,
                      offsetY: 0,
                      trimApplied: imageLayout.trimApplied ?? false,
                    })
                  }
                >
                  Resetar ajuste
                </Button>
              </div>
            </Card>
          </div>

          <div className="grid gap-2 text-sm">
            <Label>Produto</Label>
            <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">
              {productName || baseProduct?.name || "Produto"} - SKU {baseProduct?.sku ?? "-"}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Imagem principal</Label>
            {!mainImageUrl ? (
              <Card className="p-4 text-sm text-muted-foreground">
                Nenhuma imagem principal cadastrada.
              </Card>
            ) : (
              <Card className="space-y-2 p-3">
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  <img
                    src={mainImageUrl}
                    alt={productName || baseProduct?.name || "Imagem principal"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveMainImage}
                    disabled={isSaving}
                  >
                    Remover imagem principal
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Galeria de imagens</Label>
            {isLoadingGallery ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando galeria...
              </div>
            ) : galleryImages.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">
                Nenhuma imagem na galeria.
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((image) => (
                  <Card key={image.id} className="relative overflow-hidden">
                    <div className="aspect-square">
                      <img
                        src={image.imageUrl}
                        alt="Imagem da galeria"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/50 p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 flex-1 text-xs text-white hover:bg-white/20"
                        onClick={() => handleSetAsMain(image)}
                        disabled={isSaving || image.imageUrl === mainImageUrl}
                      >
                        Principal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-white hover:bg-red-500/50"
                        onClick={() => handleDeleteGalleryImage(image)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="base-product-image">Adicionar imagem</Label>
            <Input
              id="base-product-image"
              type="file"
              accept="image/*"
              disabled={isSaving}
              className="cursor-pointer file:cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
            />
            {previewUrl ? (
              <Card className="p-3">
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  <img
                    src={previewUrl}
                    alt={selectedFile?.name ?? "Preview"}
                    className="h-full w-full object-cover"
                  />
                </div>
              </Card>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 bg-background pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Fechar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving || !selectedFile}>
              {isSaving ? "Enviando..." : "Adicionar a galeria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

