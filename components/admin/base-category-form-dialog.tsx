"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import type {
  CategoryV2,
  CreateCategoryV2Request,
  UpdateCategoryV2Request,
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
import { useCreateCategoryV2, useUpdateCategoryV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BaseCategoryFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: CategoryV2;
  onSuccess?: () => void;
};

export function BaseCategoryFormDialog({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSuccess,
}: BaseCategoryFormDialogProps) {
  const createMutation = useCreateCategoryV2();
  const updateMutation = useUpdateCategoryV2();

  const isEditing = mode === "edit";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar categoria" : "Nova categoria"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize o nome da categoria selecionada."
        : "Cadastre uma nova categoria para a base geral.",
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
      toastError("Nome obrigatorio", "Informe o nome da categoria.");
      return;
    }

    try {
      if (isEditing) {
        if (!initialValues?.id) {
          toastError("Categoria invalida", "Selecione uma categoria valida.");
          return;
        }

        const payload: UpdateCategoryV2Request = { name: trimmedName };
        await updateMutation.mutateAsync({
          id: initialValues.id,
          data: payload,
        });
        toastSuccess("Categoria atualizada");
      } else {
        const payload: CreateCategoryV2Request = { name: trimmedName };
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
            <Label htmlFor="base-category-name">Nome</Label>
            <Input
              id="base-category-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Ex.: Higiene"
              required
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
              {isEditing ? "Salvar alteracoes" : "Criar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
