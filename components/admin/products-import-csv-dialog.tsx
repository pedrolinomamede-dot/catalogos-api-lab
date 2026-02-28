"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { CreateProductRequest } from "@/types/api";

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
import { getErrorMessage } from "@/lib/api/error";
import { useImportProductsCsv } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BulkImportResult = {
  created: number;
  skipped: number;
  skippedItems: Array<{ index: number; name: string; reason: string }>;
  errors: unknown[];
};

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024;

const normalizeHeader = (value: string) =>
  value.trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[\s_]+/g, "");

const parseBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "sim", "ativo"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "nao", "não", "inativo"].includes(normalized)) {
    return false;
  }
  return undefined;
};

const parseCsv = (text: string, delimiter: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
};

const parseCsvProducts = (fileContent: string) => {
  const firstLine = fileContent.split(/\r?\n/)[0] ?? "";
  const delimiter =
    firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows = parseCsv(fileContent, delimiter);

  if (rows.length < 2) {
    return { error: "CSV vazio ou sem linhas de dados." } as const;
  }

  const header = rows[0].map(normalizeHeader);
  const headerIndex = Object.fromEntries(
    header.map((column, index) => [column, index]),
  ) as Record<string, number>;

  if (headerIndex.sku === undefined || headerIndex.name === undefined) {
    return {
      error: "Cabeçalho inválido. Inclua colunas sku e name.",
    } as const;
  }

  const items: CreateProductRequest[] = [];
  let skipped = 0;

  const getValue = (row: string[], key: string) => {
    const index = headerIndex[key];
    if (index === undefined) {
      return "";
    }
    return row[index] ?? "";
  };

  rows.slice(1).forEach((row) => {
    const sku = getValue(row, "sku").trim();
    const name = getValue(row, "name").trim();

    if (!sku || !name || !/^\d{4}$/.test(sku)) {
      skipped += 1;
      return;
    }

    const description = getValue(row, "description").trim();
    const categoryId =
      getValue(row, "categoryid").trim() || getValue(row, "category").trim();
    const isActiveValue = parseBoolean(getValue(row, "isactive"));

    const variantType = getValue(row, "varianttype").trim();
    const variantValue = getValue(row, "variantvalue").trim();
    const priceValue = getValue(row, "price").trim();
    const stockQuantityValue = getValue(row, "stockquantity").trim();
    const barcode = getValue(row, "barcode").trim();

    const payload: CreateProductRequest = {
      sku,
      name,
      description: description || undefined,
      categoryId: categoryId || undefined,
      isActive: isActiveValue,
    };

    if (priceValue) {
      const price = Number(priceValue);
      if (!Number.isFinite(price)) {
        skipped += 1;
        return;
      }
      payload.variations = [
        {
          variantType: variantType || undefined,
          variantValue: variantValue || undefined,
          price,
          stockQuantity: stockQuantityValue
            ? Number(stockQuantityValue)
            : undefined,
          barcode: barcode || undefined,
        },
      ];
    }

    items.push(payload);
  });

  if (items.length === 0) {
    return { error: "Nenhuma linha válida encontrada no CSV." } as const;
  }

  return { items, skipped } as const;
};

const getSkuConflictHint = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return null;
  }
  const payload =
    "payload" in error ? (error as { payload?: unknown }).payload : undefined;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as {
    ok?: unknown;
    error?: { code?: unknown };
  };
  if (record.ok !== false) {
    return null;
  }
  const code = record.error?.code;
  if (code === "product_conflict" || code === "duplicate_skus") {
    return "Se o SKU já existir, inclusive em produto inativo, reative-o ou altere o SKU no CSV.";
  }
  return null;
};

type ProductsImportCsvDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductsImportCsvDialog({
  open,
  onOpenChange,
}: ProductsImportCsvDialogProps) {
  const importMutation = useImportProductsCsv();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [localSkipped, setLocalSkipped] = useState<number | null>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setLocalSkipped(null);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    if (!file) {
      toastError("Selecione um arquivo CSV para importar.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toastError("Arquivo inválido", "Selecione um arquivo .csv.");
      return;
    }

    if (file.size > MAX_CSV_SIZE_BYTES) {
      toastError(
        "Arquivo muito grande",
        "O tamanho máximo permitido é 10MB.",
      );
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = parseCsvProducts(text);
      if ("error" in parsed) {
        toastError("CSV inválido", parsed.error);
        return;
      }

      setLocalSkipped(parsed.skipped);
      const response = await importMutation.mutateAsync(parsed.items);
      setResult(response);
      toastSuccess("Importação concluída");
    } catch (err) {
      const message = getErrorMessage(err);
      const skuHint = getSkuConflictHint(err);
      const description = [message.description, skuHint]
        .filter(Boolean)
        .join(" ");
      toastError(message.title, description || undefined);
    } finally {
      setIsImporting(false);
    }
  };

  const summary = useMemo(() => {
    if (!result) {
      return null;
    }
    return {
      created: result.created,
      skipped: result.skipped,
      errors: result.errors?.length ?? 0,
      skippedItems: result.skippedItems ?? [],
    };
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV com produtos para importar em lote.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="csv-file" className="cursor-pointer">
              Arquivo CSV
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              disabled={isImporting}
              className="cursor-pointer file:cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setLocalSkipped(null);
              }}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">{file.name}</p>
            ) : null}
          </div>

          {summary ? (
            <Card className="space-y-2 p-4 text-sm text-muted-foreground">
              <p>
                Importados: <strong>{summary.created}</strong>
              </p>
              <p>
                Ignorados no backend: <strong>{summary.skipped}</strong>
              </p>
              <p>
                Erros reportados: <strong>{summary.errors}</strong>
              </p>
              {typeof localSkipped === "number" ? (
                <p>
                  Ignorados localmente: <strong>{localSkipped}</strong>
                </p>
              ) : null}
              {summary.skippedItems.length > 0 ? (
                <div className="space-y-1 text-xs">
                  <p>Exemplos de itens ignorados:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {summary.skippedItems.slice(0, 3).map((item) => (
                      <li key={`${item.index}-${item.name}`}>
                        {item.name}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>
              Fechar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleImport} disabled={isImporting}>
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
