"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import type { BaseProductV2 } from "@/types/api";

import {
  Dialog,
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
import { queryKeys } from "@/lib/api/query-keys";
import { addBaseProductImageV2, listBaseProducts } from "@/lib/api/v2/base-products";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BaseProductsImportImagesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type BulkImageRowStatus =
  | "pending"
  | "invalid_name"
  | "sku_not_found"
  | "ready"
  | "upload_failed"
  | "link_failed"
  | "linked";

type BulkImageImportSummary = {
  total: number;
  linked: number;
  skippedInvalidName: number;
  skippedSkuNotFound: number;
  failedUpload: number;
  failedLink: number;
};

type BulkImageImportErrorItem = {
  fileName: string;
  sku: string | null;
  status: BulkImageRowStatus;
  message: string;
};

type BulkImageRow = {
  id: string;
  file: File;
  fileName: string;
  sku: string | null;
  status: BulkImageRowStatus;
  statusMessage: string;
  productBaseId?: string;
};

const MAX_UPLOAD_CHUNK = 10;
const SKU_FILE_NAME_REGEX = /^\d{4}$/;
const LINK_ENDPOINT_UNAVAILABLE_MESSAGE =
  "Endpoint de vinculo indisponivel. Reinicie o servidor e valide a versao da API.";

const statusLabel: Record<BulkImageRowStatus, string> = {
  pending: "Pendente",
  invalid_name: "Nome invalido",
  sku_not_found: "SKU nao encontrado",
  ready: "Pronto para enviar",
  upload_failed: "Falha no upload",
  link_failed: "Falha ao vincular",
  linked: "Vinculada",
};

function getBaseName(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
}

function extractSkuFromFileName(fileName: string) {
  const baseName = getBaseName(fileName).trim();
  return SKU_FILE_NAME_REGEX.test(baseName) ? baseName : null;
}

function createRows(files: File[]) {
  return files.map((file, index) => {
    const sku = extractSkuFromFileName(file.name);
    const invalidNameMessage = "Use nome com SKU de 4 digitos. Exemplo: 2047.jpg";
    return {
      id: `${file.name}-${file.lastModified}-${index}`,
      file,
      fileName: file.name,
      sku,
      status: sku ? "pending" : "invalid_name",
      statusMessage: sku ? "Aguardando importacao" : invalidNameMessage,
    } satisfies BulkImageRow;
  });
}

function toBaseProducts(items: Awaited<ReturnType<typeof listBaseProducts>>): BaseProductV2[] {
  return Array.isArray(items) ? items : items.data;
}

function splitIntoChunks<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function hasHtmlInErrorPayload(error: unknown) {
  if (typeof error === "string") {
    return /<!doctype html|<html[\s>]/i.test(error);
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { message?: unknown; payload?: unknown };

  if (typeof record.message === "string" && /<!doctype html|<html[\s>]/i.test(record.message)) {
    return true;
  }

  if (typeof record.payload === "string" && /<!doctype html|<html[\s>]/i.test(record.payload)) {
    return true;
  }

  if (
    record.payload &&
    typeof record.payload === "object" &&
    "message" in record.payload &&
    typeof (record.payload as { message?: unknown }).message === "string" &&
    /<!doctype html|<html[\s>]/i.test((record.payload as { message?: string }).message ?? "")
  ) {
    return true;
  }

  return false;
}

function buildSummary(rows: BulkImageRow[]): BulkImageImportSummary {
  const countByStatus = rows.reduce<Record<BulkImageRowStatus, number>>(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      pending: 0,
      invalid_name: 0,
      sku_not_found: 0,
      ready: 0,
      upload_failed: 0,
      link_failed: 0,
      linked: 0,
    },
  );

  return {
    total: rows.length,
    linked: countByStatus.linked,
    skippedInvalidName: countByStatus.invalid_name,
    skippedSkuNotFound: countByStatus.sku_not_found,
    failedUpload: countByStatus.upload_failed,
    failedLink: countByStatus.link_failed,
  };
}

function toErrorItems(rows: BulkImageRow[]): BulkImageImportErrorItem[] {
  return rows
    .filter((row) =>
      row.status === "invalid_name" ||
      row.status === "sku_not_found" ||
      row.status === "upload_failed" ||
      row.status === "link_failed",
    )
    .map((row) => ({
      fileName: row.fileName,
      sku: row.sku,
      status: row.status,
      message: row.statusMessage,
    }));
}

export function BaseProductsImportImagesDialog({
  open,
  onOpenChange,
}: BaseProductsImportImagesDialogProps) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<BulkImageRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<BulkImageImportSummary | null>(null);
  const [errors, setErrors] = useState<BulkImageImportErrorItem[]>([]);

  const skuCache = useMemo(() => new Map<string, BaseProductV2 | null>(), []);

  const resetState = () => {
    setRows([]);
    setSummary(null);
    setErrors([]);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isImporting) {
      return;
    }
    if (!nextOpen) {
      resetState();
      skuCache.clear();
    }
    onOpenChange(nextOpen);
  };

  const resolveBaseProductBySku = async (sku: string) => {
    if (skuCache.has(sku)) {
      return skuCache.get(sku) ?? null;
    }

    const response = await listBaseProducts({
      q: sku,
      page: 1,
      pageSize: 5,
    });
    const product = toBaseProducts(response).find((item) => item.sku === sku) ?? null;
    skuCache.set(sku, product);
    return product;
  };

  const handleImport = async () => {
    if (rows.length === 0) {
      toastError("Selecione arquivos", "Escolha imagens para importar.");
      return;
    }

    setIsImporting(true);
    setSummary(null);
    setErrors([]);

    const mutableRows = rows.map((row) => ({ ...row }));
    const updateState = () => setRows(mutableRows.map((row) => ({ ...row })));
    const rowById = new Map(mutableRows.map((row) => [row.id, row]));

    try {
      const candidateRows = mutableRows.filter((row) => row.sku && row.status !== "invalid_name");

      for (const row of candidateRows) {
        if (!row.sku) {
          continue;
        }

        try {
          const baseProduct = await resolveBaseProductBySku(row.sku);
          if (!baseProduct) {
            row.status = "sku_not_found";
            row.statusMessage = "Nao existe produto na Base Geral para esse SKU";
            continue;
          }
          row.productBaseId = baseProduct.id;
          row.status = "ready";
          row.statusMessage = "SKU encontrado. Pronto para envio";
        } catch (err) {
          const message = getErrorMessage(err);
          row.status = "sku_not_found";
          row.statusMessage = message.description ?? message.title;
        }
      }

      updateState();

      const readyRows = mutableRows.filter(
        (row) => row.status === "ready" && row.productBaseId,
      );
      const chunks = splitIntoChunks(readyRows, MAX_UPLOAD_CHUNK);

      for (const chunk of chunks) {
        const formData = new FormData();
        chunk.forEach((row) => {
          formData.append("files", row.file);
        });

        let uploadedData: Array<{ imageUrl: string }> = [];

        try {
          const uploadResponse = (await uploadImages(formData)) as {
            data?: Array<{ imageUrl: string }>;
          };
          uploadedData = uploadResponse?.data ?? [];
        } catch (err) {
          const message = getErrorMessage(err);
          chunk.forEach((row) => {
            const targetRow = rowById.get(row.id);
            if (!targetRow) {
              return;
            }
            targetRow.status = "upload_failed";
            targetRow.statusMessage = message.description ?? message.title;
          });
          updateState();
          continue;
        }

        for (let index = 0; index < chunk.length; index += 1) {
          const row = chunk[index];
          const targetRow = rowById.get(row.id);
          if (!targetRow) {
            continue;
          }

          const imageUrl = uploadedData[index]?.imageUrl;
          if (!imageUrl) {
            targetRow.status = "upload_failed";
            targetRow.statusMessage = "Resposta de upload sem URL para o arquivo";
            continue;
          }

          try {
            await addBaseProductImageV2(targetRow.productBaseId!, imageUrl);
            targetRow.status = "linked";
            targetRow.statusMessage = "Imagem vinculada com sucesso";
          } catch (err) {
            targetRow.status = "link_failed";
            if (hasHtmlInErrorPayload(err)) {
              targetRow.statusMessage = LINK_ENDPOINT_UNAVAILABLE_MESSAGE;
            } else {
              const message = getErrorMessage(err);
              targetRow.statusMessage = message.description ?? message.title;
            }
          }
        }

        updateState();
      }

      const finalRows = mutableRows.map((row) => ({ ...row }));
      const nextSummary = buildSummary(finalRows);
      const nextErrors = toErrorItems(finalRows);

      setSummary(nextSummary);
      setErrors(nextErrors);

      await queryClient.invalidateQueries({ queryKey: queryKeys.v2.baseProducts.root });

      const failedOrSkipped =
        nextSummary.skippedInvalidName +
        nextSummary.skippedSkuNotFound +
        nextSummary.failedUpload +
        nextSummary.failedLink;

      if (nextSummary.linked > 0 && failedOrSkipped === 0) {
        toastSuccess("Importacao concluida");
      } else if (nextSummary.linked > 0) {
        toastSuccess("Importacao parcial concluida");
        toastError("Alguns arquivos nao foram vinculados", "Revise o resumo abaixo.");
      } else {
        toastError("Nenhuma imagem vinculada", "Revise os nomes e SKUs dos arquivos.");
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar imagens por SKU</DialogTitle>
          <DialogDescription>
            Nomeie os arquivos com SKU de 4 digitos (exemplo: 2047.jpg). O sistema vincula
            automaticamente na Base Geral.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bulk-base-product-images" className="cursor-pointer">
              Arquivos de imagem
            </Label>
            <Input
              id="bulk-base-product-images"
              type="file"
              accept="image/*"
              multiple
              disabled={isImporting}
              className="cursor-pointer file:cursor-pointer"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setRows(createRows(files));
                setSummary(null);
                setErrors([]);
                skuCache.clear();
              }}
            />
            <p className="text-xs text-muted-foreground">
              {rows.length > 0
                ? `${rows.length} arquivo(s) selecionado(s).`
                : "Selecione um ou mais arquivos de imagem."}
            </p>
          </div>

          {rows.length > 0 ? (
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="px-3 py-2 font-medium">Arquivo</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{row.fileName}</td>
                      <td className="px-3 py-2">{row.sku ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <p>{statusLabel[row.status]}</p>
                          <p className="text-xs text-muted-foreground">{row.statusMessage}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {summary ? (
            <Card className="space-y-2 p-4 text-sm text-muted-foreground">
              <p>
                Total: <strong>{summary.total}</strong>
              </p>
              <p>
                Vinculadas: <strong>{summary.linked}</strong>
              </p>
              <p>
                Ignoradas por nome invalido: <strong>{summary.skippedInvalidName}</strong>
              </p>
              <p>
                Ignoradas por SKU nao encontrado: <strong>{summary.skippedSkuNotFound}</strong>
              </p>
              <p>
                Falhas de upload: <strong>{summary.failedUpload}</strong>
              </p>
              <p>
                Falhas de vinculo: <strong>{summary.failedLink}</strong>
              </p>
              {errors.length > 0 ? (
                <div className="space-y-1 text-xs">
                  <p>Exemplos de pendencias:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {errors.slice(0, 5).map((item) => (
                      <li key={`${item.fileName}-${item.status}`}>
                        {item.fileName} ({item.sku ?? "-"}) - {statusLabel[item.status]}:{" "}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isImporting}
            onClick={() => handleDialogChange(false)}
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isImporting || rows.length === 0}
          >
            {isImporting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando...
              </span>
            ) : (
              "Importar imagens"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
