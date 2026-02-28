"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import type { CatalogV2, CreateCatalogV2Request, UpdateCatalogV2Request } from "@/types/api";

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
import { useCreateCatalogV2, useUpdateCatalogV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type CatalogFormDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: CatalogV2;
  onSuccess?: () => void;
};

export function CatalogFormDialog({
  mode,
  open,
  onOpenChange,
  initialValues,
  onSuccess,
}: CatalogFormDialogProps) {
  const createMutation = useCreateCatalogV2();
  const updateMutation = useUpdateCatalogV2();

  const isEditing = mode === "edit";
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar catalogo" : "Novo catalogo"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize os dados do catalogo selecionado."
        : "Cadastre um novo catalogo para a base geral.",
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
    const description = String(formData.get("description") ?? "").trim();

    if (!trimmedName) {
      toastError("Nome obrigatorio", "Informe o nome do catalogo.");
      return;
    }

    try {
      if (isEditing) {
        if (!initialValues?.id) {
          toastError("Catalogo invalido", "Selecione um catalogo valido.");
          return;
        }

        const payload: UpdateCatalogV2Request = {
          name: trimmedName,
          description: description || null,
        };
        await updateMutation.mutateAsync({
          id: initialValues.id,
          data: payload,
        });
        toastSuccess("Catalogo atualizado");
      } else {
        const payload: CreateCatalogV2Request = {
          name: trimmedName,
          description: description || null,
        };
        await createMutation.mutateAsync(payload);
        toastSuccess("Catalogo criado");
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
            <Label htmlFor="catalog-name">Nome</Label>
            <Input
              id="catalog-name"
              name="name"
              defaultValue={initialValues?.name ?? ""}
              placeholder="Ex.: Promocao Setembro"
              required
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="catalog-description">Descricao (opcional)</Label>
            <Input
              id="catalog-description"
              name="description"
              defaultValue={initialValues?.description ?? ""}
              placeholder="Descricao do catalogo"
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
              {isEditing ? "Salvar alteracoes" : "Criar catalogo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
