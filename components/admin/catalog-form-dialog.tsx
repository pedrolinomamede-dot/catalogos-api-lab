"use client";

import { useEffect, useMemo, useState } from "react";
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
import { uploadImages } from "@/lib/api/admin";
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

const FONT_FAMILIES = [
  { label: "Manrope", value: "MANROPE" },
  { label: "Playfair Display", value: "PLAYFAIR" },
  { label: "Poppins", value: "POPPINS" },
] as const;

const FONT_WEIGHTS = [
  { label: "Regular (400)", value: 400 },
  { label: "Medium (500)", value: 500 },
  { label: "SemiBold (600)", value: 600 },
  { label: "Bold (700)", value: 700 },
] as const;

const DEFAULTS = {
  stripeBgColor: "#0B1B5E",
  stripeLineColor: "#D81B3A",
  stripeTextColor: "#FFFFFF",
  stripeFontFamily: "MANROPE",
  stripeFontWeight: "600",
  stripeFontSize: "18",
} as const;

function normalizeNullableString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseOptionalInt(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function uploadFile(file: File) {
  const formPayload = new FormData();
  formPayload.append("files", file);
  const response = (await uploadImages(formPayload)) as {
    data?: Array<{ imageUrl: string }>;
  };
  const imageUrl = response?.data?.[0]?.imageUrl;
  if (!imageUrl) {
    throw new Error("Nao foi possivel obter a URL da imagem enviada.");
  }
  return imageUrl;
}

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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leftLogoUrl, setLeftLogoUrl] = useState<string | null>(null);
  const [rightLogoUrl, setRightLogoUrl] = useState<string | null>(null);
  const [leftLogoFile, setLeftLogoFile] = useState<File | null>(null);
  const [rightLogoFile, setRightLogoFile] = useState<File | null>(null);
  const [leftLogoPreviewUrl, setLeftLogoPreviewUrl] = useState<string | null>(null);
  const [rightLogoPreviewUrl, setRightLogoPreviewUrl] = useState<string | null>(null);
  const [stripeBgColor, setStripeBgColor] = useState<string>(DEFAULTS.stripeBgColor);
  const [stripeLineColor, setStripeLineColor] = useState<string>(DEFAULTS.stripeLineColor);
  const [stripeTextColor, setStripeTextColor] = useState<string>(DEFAULTS.stripeTextColor);
  const [stripeFontFamily, setStripeFontFamily] = useState<string>(DEFAULTS.stripeFontFamily);
  const [stripeFontWeight, setStripeFontWeight] = useState<string>(DEFAULTS.stripeFontWeight);
  const [stripeFontSize, setStripeFontSize] = useState<string>(DEFAULTS.stripeFontSize);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialValues?.name ?? "");
    setDescription(initialValues?.description ?? "");
    setLeftLogoUrl(initialValues?.pdfHeaderLeftLogoUrl?.trim() || null);
    setRightLogoUrl(initialValues?.pdfHeaderRightLogoUrl?.trim() || null);
    setLeftLogoFile(null);
    setRightLogoFile(null);
    setLeftLogoPreviewUrl(null);
    setRightLogoPreviewUrl(null);
    setStripeBgColor(initialValues?.pdfStripeBgColor ?? DEFAULTS.stripeBgColor);
    setStripeLineColor(initialValues?.pdfStripeLineColor ?? DEFAULTS.stripeLineColor);
    setStripeTextColor(initialValues?.pdfStripeTextColor ?? DEFAULTS.stripeTextColor);
    setStripeFontFamily(initialValues?.pdfStripeFontFamily ?? DEFAULTS.stripeFontFamily);
    setStripeFontWeight(
      initialValues?.pdfStripeFontWeight?.toString() ?? DEFAULTS.stripeFontWeight,
    );
    setStripeFontSize(
      initialValues?.pdfStripeFontSize?.toString() ?? DEFAULTS.stripeFontSize,
    );
  }, [initialValues, open]);

  useEffect(() => {
    if (!leftLogoFile) {
      setLeftLogoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const url = URL.createObjectURL(leftLogoFile);
    setLeftLogoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return url;
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [leftLogoFile]);

  useEffect(() => {
    if (!rightLogoFile) {
      setRightLogoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const url = URL.createObjectURL(rightLogoFile);
    setRightLogoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return url;
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [rightLogoFile]);

  const dialogTitle = useMemo(
    () => (isEditing ? "Editar catalogo" : "Novo catalogo"),
    [isEditing],
  );
  const dialogDescription = useMemo(
    () =>
      isEditing
        ? "Atualize os dados do catalogo e as configuracoes de PDF."
        : "Cadastre um novo catalogo para a base geral.",
    [isEditing],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toastError("Nome obrigatorio", "Informe o nome do catalogo.");
      return;
    }

    try {
      let leftLogo = leftLogoUrl;
      let rightLogo = rightLogoUrl;

      if (leftLogoFile) {
        leftLogo = await uploadFile(leftLogoFile);
      }
      if (rightLogoFile) {
        rightLogo = await uploadFile(rightLogoFile);
      }

      const payload: CreateCatalogV2Request = {
        name: trimmedName,
        description: normalizeNullableString(description),
        pdfHeaderLeftLogoUrl: leftLogo,
        pdfHeaderRightLogoUrl: rightLogo,
        pdfStripeBgColor: normalizeNullableString(stripeBgColor),
        pdfStripeLineColor: normalizeNullableString(stripeLineColor),
        pdfStripeTextColor: normalizeNullableString(stripeTextColor),
        pdfStripeFontFamily: normalizeNullableString(stripeFontFamily),
        pdfStripeFontWeight: parseOptionalInt(stripeFontWeight),
        pdfStripeFontSize: parseOptionalInt(stripeFontSize),
      };

      if (isEditing) {
        if (!initialValues?.id) {
          toastError("Catalogo invalido", "Selecione um catalogo valido.");
          return;
        }

        await updateMutation.mutateAsync({
          id: initialValues.id,
          data: payload as UpdateCatalogV2Request,
        });
        toastSuccess("Catalogo atualizado");
      } else {
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

  const leftPreview = leftLogoPreviewUrl ?? leftLogoUrl;
  const rightPreview = rightLogoPreviewUrl ?? rightLogoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 py-2" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="catalog-name">Nome</Label>
            <Input
              id="catalog-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descricao do catalogo"
              disabled={isSaving}
            />
          </div>

          <div className="grid gap-4 rounded-md border p-3">
            <p className="text-sm font-semibold text-foreground">Logos do cabecalho do PDF</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="catalog-logo-left">Logo esquerda</Label>
                <Input
                  id="catalog-logo-left"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isSaving}
                  onChange={(event) => {
                    setLeftLogoFile(event.target.files?.[0] ?? null);
                  }}
                />
                <div className="h-24 overflow-hidden rounded-md border bg-muted/20">
                  {leftPreview ? (
                    <img
                      src={leftPreview}
                      alt="Preview logo esquerda"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Sem logo
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving || (!leftLogoUrl && !leftLogoFile)}
                  onClick={() => {
                    setLeftLogoFile(null);
                    setLeftLogoUrl(null);
                  }}
                >
                  Remover logo esquerda
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="catalog-logo-right">Logo direita</Label>
                <Input
                  id="catalog-logo-right"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isSaving}
                  onChange={(event) => {
                    setRightLogoFile(event.target.files?.[0] ?? null);
                  }}
                />
                <div className="h-24 overflow-hidden rounded-md border bg-muted/20">
                  {rightPreview ? (
                    <img
                      src={rightPreview}
                      alt="Preview logo direita"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Sem logo
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving || (!rightLogoUrl && !rightLogoFile)}
                  onClick={() => {
                    setRightLogoFile(null);
                    setRightLogoUrl(null);
                  }}
                >
                  Remover logo direita
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 rounded-md border p-3">
            <p className="text-sm font-semibold text-foreground">Estilo da tarja (categoria + medida)</p>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-bg">Cor da tarja</Label>
                <Input
                  id="pdf-stripe-bg"
                  value={stripeBgColor}
                  onChange={(event) => setStripeBgColor(event.target.value)}
                  placeholder="#0B1B5E"
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-line">Cor da linha</Label>
                <Input
                  id="pdf-stripe-line"
                  value={stripeLineColor}
                  onChange={(event) => setStripeLineColor(event.target.value)}
                  placeholder="#D81B3A"
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-text">Cor do texto</Label>
                <Input
                  id="pdf-stripe-text"
                  value={stripeTextColor}
                  onChange={(event) => setStripeTextColor(event.target.value)}
                  placeholder="#FFFFFF"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-font-family">Fonte</Label>
                <select
                  id="pdf-stripe-font-family"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={stripeFontFamily}
                  onChange={(event) => setStripeFontFamily(event.target.value)}
                  disabled={isSaving}
                >
                  {FONT_FAMILIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-font-weight">Peso</Label>
                <select
                  id="pdf-stripe-font-weight"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={stripeFontWeight}
                  onChange={(event) => setStripeFontWeight(event.target.value)}
                  disabled={isSaving}
                >
                  {FONT_WEIGHTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdf-stripe-font-size">Tamanho</Label>
                <Input
                  id="pdf-stripe-font-size"
                  type="number"
                  min={12}
                  max={36}
                  value={stripeFontSize}
                  onChange={(event) => setStripeFontSize(event.target.value)}
                  disabled={isSaving}
                />
              </div>
            </div>
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
