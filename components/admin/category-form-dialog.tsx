"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
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
import { getErrorMessage } from "@/lib/api/error";
import { useCreateCategory, useUpdateCategory } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type CategoryFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Category;
  onSuccess?: () => void;
};

export function CategoryFormDialog({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSuccess,
}: CategoryFormDialogProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();

  const isEditing = mode === "edit";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar categoria" : "Nova categoria"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize os dados da categoria selecionada."
        : "Cadastre uma nova categoria para o catálogo.",
    [isEditing],
  );

  const formKey = useMemo(() => {
    const baseKey = isEditing ? `edit-${initialValues?.id ?? "new"}` : "create";
    return `${baseKey}-${open ? "open" : "closed"}`;
  }, [isEditing, initialValues?.id, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const trimmedName = String(formData.get("name") ?? "").trim();
    if (!trimmedName) {
      toastError("Nome obrigatório", "Informe o nome da categoria.");
      return;
    }

    const icon = String(formData.get("icon") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim();
    const sortOrderValue = String(formData.get("sortOrder") ?? "").trim();
    const parsedSortOrder = sortOrderValue
      ? Number(sortOrderValue)
      : undefined;
    const safeSortOrder = Number.isNaN(parsedSortOrder)
      ? undefined
      : parsedSortOrder;

    try {
      if (isEditing) {
        if (!initialValues?.id) {
          toastError("Categoria inválida", "Selecione uma categoria válida.");
          return;
        }

        const payload: UpdateCategoryRequest = {
          name: trimmedName,
          icon: icon || undefined,
          color: color || undefined,
          sortOrder: safeSortOrder,
        };
        await updateMutation.mutateAsync({
          id: initialValues.id,
          data: payload,
        });
        toastSuccess("Categoria atualizada");
      } else {
        const payload: CreateCategoryRequest = {
          name: trimmedName,
          icon: icon || undefined,
          color: color || undefined,
          sortOrder: safeSortOrder,
        };
        await createMutation.mutateAsync(payload);
        toastSuccess("Categoria criada");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 py-2" key={formKey} onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Ex.: Bebidas"
              required
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-icon">Ícone (opcional)</Label>
            <Input
              id="category-icon"
              name="icon"
              defaultValue={initialValues?.icon ?? ""}
              placeholder="Ex.: cup-soda"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-color">Cor (opcional)</Label>
            <Input
              id="category-color"
              name="color"
              defaultValue={initialValues?.color ?? ""}
              placeholder="Ex.: #0f172a"
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-order">Ordem</Label>
            <Input
              id="category-order"
              name="sortOrder"
              type="number"
              defaultValue={initialValues?.sortOrder ?? ""}
              placeholder="0"
              disabled={isSaving}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Salvar alterações" : "Criar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
