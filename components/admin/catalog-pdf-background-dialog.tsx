"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CatalogV2 } from "@/types/api";

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
import { getErrorMessage } from "@/lib/api/error";
import { uploadImages } from "@/lib/api/admin";
import { useUpdateCatalogV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type CatalogPdfBackgroundDialogProps = {
  catalog: CatalogV2;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CatalogPdfBackgroundDialog({
  catalog,
  open,
  onOpenChange,
}: CatalogPdfBackgroundDialogProps) {
  const updateCatalogMutation = useUpdateCatalogV2();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentBackgroundUrl = catalog.pdfBackgroundImageUrl?.trim() || null;
  const previewUrl = draftPreviewUrl ?? currentBackgroundUrl;
  const isSaving = isUploading || updateCatalogMutation.isPending;

  useEffect(() => {
    if (!selectedFile) {
      setDraftPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setDraftPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return url;
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedFile(null);
    }
    onOpenChange(nextOpen);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toastError("Selecione uma imagem", "Escolha um arquivo para o fundo do PDF.");
      return;
    }

    setIsUploading(true);
    try {
      const formPayload = new FormData();
      formPayload.append("files", selectedFile);
      const response = (await uploadImages(formPayload)) as {
        data?: Array<{ imageUrl: string }>;
      };
      const uploadedUrl = response?.data?.[0]?.imageUrl;
      if (!uploadedUrl) {
        toastError("Upload falhou", "Nao foi possivel obter a URL da imagem enviada.");
        return;
      }

      await updateCatalogMutation.mutateAsync({
        id: catalog.id,
        data: {
          pdfBackgroundImageUrl: uploadedUrl,
        },
      });
      toastSuccess("Fundo do PDF atualizado");
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!currentBackgroundUrl) {
      toastError("Sem fundo personalizado", "Este catalogo ja usa o fundo padrao.");
      return;
    }

    try {
      await updateCatalogMutation.mutateAsync({
        id: catalog.id,
        data: {
          pdfBackgroundImageUrl: null,
        },
      });
      toastSuccess("Fundo personalizado removido");
      setSelectedFile(null);
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fundo do PDF</DialogTitle>
          <DialogDescription>
            Envie uma imagem para ser usada como fundo deste catalogo na exportacao de PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div className="overflow-hidden rounded-lg border bg-muted/20">
              <div className="relative h-40 w-full">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview do fundo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Fundo padrao do sistema
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nova imagem
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isSaving}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
              }}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              Formatos: JPG, PNG ou WEBP. Maximo configurado pelo sistema.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
            disabled={isSaving || !currentBackgroundUrl}
          >
            Remover fundo
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleUpload} disabled={isSaving || !selectedFile}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar fundo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
