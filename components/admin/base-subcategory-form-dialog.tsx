"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import type {
  CreateSubcategoryV2Request,
  SubcategoryV2,
  UpdateSubcategoryV2Request,
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
import {
  useCreateSubcategoryV2,
  useUpdateSubcategoryV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BaseSubcategoryFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  initialValues?: SubcategoryV2;
  onSuccess?: () => void;
};

export function BaseSubcategoryFormDialog({
  mode,
  open,
  onOpenChange,
  categoryId,
  initialValues,
  onSuccess,
}: BaseSubcategoryFormDialogProps) {
  const createMutation = useCreateSubcategoryV2(categoryId);
  const updateMutation = useUpdateSubcategoryV2(categoryId);

  const isEditing = mode === "edit";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar subcategoria" : "Nova subcategoria"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize o nome da subcategoria selecionada."
        : "Cadastre uma nova subcategoria.",
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
      toastError("Nome obrigatorio", "Informe o nome da subcategoria.");
      return;
    }

    try {
      if (isEditing) {
        if (!initialValues?.id) {
          toastError("Subcategoria invalida", "Selecione uma subcategoria valida.");
          return;
        }

        const payload: UpdateSubcategoryV2Request = { name: trimmedName };
        await updateMutation.mutateAsync({
          id: initialValues.id,
          data: payload,
        });
        toastSuccess("Subcategoria atualizada");
      } else {
        const payload: CreateSubcategoryV2Request = { name: trimmedName };
        await createMutation.mutateAsync(payload);
        toastSuccess("Subcategoria criada");
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
            <Label htmlFor="base-subcategory-name">Nome</Label>
            <Input
              id="base-subcategory-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Ex.: Limpeza"
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
              {isEditing ? "Salvar alteracoes" : "Criar subcategoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
