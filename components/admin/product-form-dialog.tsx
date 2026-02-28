"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type {
  Category,
  CreateProductRequest,
  Product,
  ProductImage,
  UpdateProductRequest,
} from "@/types/api";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageManager, type ImageDraft } from "@/components/admin/image-manager";
import {
  createProductVariation,
  deleteProductVariation,
  updateProductVariation,
} from "@/lib/api/admin";
import { getErrorMessage } from "@/lib/api/error";
import {
  useCategories,
  useCreateProduct,
  useDeleteVariationImage,
  useProduct,
  useReorderVariationImages,
  useUploadVariationImages,
  useUpdateProduct,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";
import {
  VariationManager,
  type VariationDraft,
} from "@/components/admin/variation-manager";

type ProductFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Product;
  onSuccess?: () => void;
};

export function ProductFormDialog({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSuccess,
}: ProductFormDialogProps) {
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [variationsDraft, setVariationsDraft] = useState<VariationDraft[]>([]);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);

  const isEditing = mode === "edit" || Boolean(createdProduct);
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const uploadImagesMutation = useUploadVariationImages();
  const deleteImageMutation = useDeleteVariationImage();
  const reorderImagesMutation = useReorderVariationImages();
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();
  const productId = createdProduct?.id ?? initialValues?.id ?? "";
  const { data: productDetails } = useProduct(productId);
  const resolvedProduct = productDetails ?? createdProduct ?? initialValues;
  const imagesVariationId = resolvedProduct?.variations?.[0]?.id;
  const reorderDisabledReason =
    isEditing && !imagesVariationId
      ? "Adicione ao menos uma variação para ordenar imagens."
      : undefined;

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const formKey = useMemo(() => {
    const baseKey = isEditing ? `edit-${productId || "new"}` : "create";
    return `${baseKey}-${open ? "open" : "closed"}`;
  }, [isEditing, productId, open]);

  const variationsKey = useMemo(() => {
    const count = resolvedProduct?.variations?.length ?? 0;
    return `variations-${resolvedProduct?.id ?? "new"}-${count}`;
  }, [resolvedProduct?.id, resolvedProduct?.variations?.length]);

  const imagesKey = useMemo(() => {
    const count =
      resolvedProduct?.variations?.reduce(
        (total, variation) => total + (variation.images?.length ?? 0),
        0,
      ) ?? 0;
    return `images-${resolvedProduct?.id ?? "new"}-${count}`;
  }, [resolvedProduct?.id, resolvedProduct?.variations]);

  const initialImages = useMemo(() => {
    return (
      resolvedProduct?.variations?.flatMap(
        (variation) => variation.images ?? [],
      ) ?? []
    );
  }, [resolvedProduct?.variations]);

  const normalizedVariations = useMemo(() => {
    return variationsDraft
      .map((draft) => {
        const variantType = draft.variantType.trim();
        const variantValue = draft.variantValue.trim();
        const priceValue = draft.price.trim();
        const barcode = draft.barcode.trim();
        const hasAny = variantType || variantValue || priceValue || barcode;
        if (!hasAny) {
          return null;
        }
        const price = Number(priceValue);
        return {
          id: draft.id,
          variantType: variantType || undefined,
          variantValue: variantValue || undefined,
          price,
          barcode: barcode || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [variationsDraft]);

  const hasInvalidVariations = useMemo(() => {
    if (normalizedVariations.length === 0) {
      return false;
    }
    return normalizedVariations.some((variation) => {
      const hasType = Boolean(variation.variantType);
      const hasValue = Boolean(variation.variantValue);
      const invalidTypeValue = hasType !== hasValue;
      const invalidPrice = !Number.isFinite(variation.price);
      return invalidTypeValue || invalidPrice;
    });
  }, [normalizedVariations]);

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar produto" : "Novo produto"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize os dados básicos do produto selecionado."
        : "Cadastre um novo produto no catálogo.",
    [isEditing],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sku = String(formData.get("sku") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
    const isActive = formData.get("isActive") === "on";

    if (!sku || !name) {
      toastError("Campos obrigatórios", "Informe SKU e nome do produto.");
      return;
    }

    if (hasInvalidVariations && normalizedVariations.length > 0) {
      toastError(
        "Variações incompletas",
        "Preencha tipo, valor e preço das variações antes de salvar.",
      );
      return;
    }

    try {
      if (isEditing) {
        const targetId = resolvedProduct?.id;
        if (!targetId) {
          toastError("Produto inválido", "Selecione um produto válido.");
          return;
        }

        const payload = {
          sku,
          name,
          categoryId: categoryIdRaw ? categoryIdRaw : null,
          isActive,
        } as UpdateProductRequest;
        await updateMutation.mutateAsync({
          id: targetId,
          data: payload,
        });
        const existingVariations = resolvedProduct?.variations ?? [];
        const draftsWithId = normalizedVariations.filter(
          (variation) => variation.id,
        );
        const newDrafts = normalizedVariations.filter(
          (variation) => !variation.id,
        );
        const removedIds = existingVariations
          .filter(
            (variation) =>
              !normalizedVariations.some((item) => item.id === variation.id),
          )
          .map((variation) => variation.id);

        await Promise.all([
          ...draftsWithId.map((variation) =>
            updateProductVariation(targetId, variation.id!, {
              variantType: variation.variantType,
              variantValue: variation.variantValue,
              price: variation.price,
              barcode: variation.barcode,
            }),
          ),
          ...newDrafts.map((variation) =>
            createProductVariation(targetId, {
              variantType: variation.variantType,
              variantValue: variation.variantValue,
              price: variation.price,
              barcode: variation.barcode,
            }),
          ),
          ...removedIds.map((variationId) =>
            deleteProductVariation(targetId, variationId),
          ),
        ]);

        if (imageDrafts.length > 0) {
          const targetVariation = resolvedProduct?.variations?.[0];
          if (!targetVariation?.id) {
            toastError(
              "Não foi possível enviar imagens",
              "Adicione ao menos uma variação antes de enviar imagens.",
            );
            return;
          }
          await uploadImagesMutation.mutateAsync({
            variationId: targetVariation.id,
            productId: targetId,
            files: imageDrafts.map((draft) => draft.file),
            altTexts: imageDrafts.map((draft) => draft.file.name),
            invalidateList: true,
          });
        }
        toastSuccess("Produto atualizado");
      } else {
        const payload: CreateProductRequest = {
          sku,
          name,
          categoryId: categoryIdRaw ? categoryIdRaw : undefined,
          isActive,
          variations: normalizedVariations.length
            ? normalizedVariations.map((variation) => ({
                variantType: variation.variantType,
                variantValue: variation.variantValue,
                price: variation.price,
                barcode: variation.barcode,
              }))
            : undefined,
        };
        const created = await createMutation.mutateAsync(payload);
        setCreatedProduct(created);
        const targetVariation = created.variations?.[0];
        if (imageDrafts.length > 0) {
          if (!targetVariation?.id) {
            toastError(
              "Não foi possível enviar imagens",
              "Adicione ao menos uma variação antes de enviar imagens.",
            );
            return;
          }
          await uploadImagesMutation.mutateAsync({
            variationId: targetVariation.id,
            productId: created.id,
            files: imageDrafts.map((draft) => draft.file),
            altTexts: imageDrafts.map((draft) => draft.file.name),
          });
        }
        toastSuccess("Produto criado");
      }

      setCreatedProduct(null);
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    }
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCreatedProduct(null);
      setImageDrafts([]);
      setVariationsDraft([]);
    }
    onOpenChange(nextOpen);
  };

  const handleDeleteImage = async (image: ProductImage) => {
    try {
      await deleteImageMutation.mutateAsync({
        variationId: image.variationId,
        imageId: image.id,
        productId,
      });
      toastSuccess("Imagem removida");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError("Não foi possível remover imagem", message.description);
      throw err;
    }
  };

  const handleReorderImages = async (orderedImages: ProductImage[]) => {
    if (!imagesVariationId) {
      throw new Error("missing_variation");
    }
    await reorderImagesMutation.mutateAsync({
      variationId: imagesVariationId,
      orderedIds: orderedImages.map((image) => image.id),
      productId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 py-2" key={formKey} onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              name="sku"
              defaultValue={resolvedProduct?.sku ?? ""}
              placeholder="SKU-001"
              required
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              name="name"
              defaultValue={resolvedProduct?.name ?? ""}
              placeholder="Ex.: Refrigerante 2L"
              required
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="product-category">Categoria (opcional)</Label>
            <select
              id="product-category"
              name="categoryId"
              defaultValue={resolvedProduct?.categoryId ?? ""}
              disabled={isSaving || isCategoriesLoading}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Sem categoria</option>
              {(categories ?? []).map((category: Category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={resolvedProduct?.isActive ?? true}
              disabled={isSaving}
              className="h-4 w-4 rounded border border-input"
            />
            Ativo
          </label>
          <VariationManager
            key={variationsKey}
            initialVariations={resolvedProduct?.variations}
            onChange={setVariationsDraft}
          />
          <ImageManager
            key={imagesKey}
            initialImages={initialImages}
            onDraftChange={setImageDrafts}
            onDeletePersisted={handleDeleteImage}
            onReorderPersisted={imagesVariationId ? handleReorderImages : undefined}
            reorderDisabledReason={reorderDisabledReason}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Salvar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
