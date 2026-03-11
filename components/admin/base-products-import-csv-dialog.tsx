"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { ImportBaseProductsCsvV2Item } from "@/types/api";

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
import { getErrorMessage } from "@/lib/api/error";
import {
  BaseProductsImportResult,
  useImportBaseProductsCsv,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type BaseProductsImportCsvDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024;
const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

const normalizeHeader = (value: string) =>
  value
    .trim()
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const HEADER_ALIASES = {
  code: ["codigo", "sku", "code"],
  barcode: ["codigodebarra", "barcode", "ean", "gtin"],
  size: ["tamanho", "size"],
  line: ["linha", "line"],
  brand: ["marca", "brand"],
  name: ["nome", "name"],
  category: ["categoria", "category"],
  subcategory: ["subcategoria", "subcategory", "subcategoryname"],
} as const;

const parseCsv = (text: string, delimiter: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
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

const resolveHeaderIndex = (
  headerIndex: Record<string, number>,
  aliases: readonly string[],
) => {
  for (const alias of aliases) {
    if (headerIndex[alias] !== undefined) {
      return headerIndex[alias];
    }
  }
  return undefined;
};

const parseCsvBaseProducts = (fileContent: string) => {
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

  const codeIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.code);
  const nameIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.name);

  if (codeIndex === undefined || nameIndex === undefined) {
    return {
      error:
        "Cabecalho invalido. Inclua pelo menos as colunas Codigo e Nome (demais colunas sao opcionais, com aliases compativeis).",
    } as const;
  }

  const barcodeIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.barcode);
  const sizeIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.size);
  const lineIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.line);
  const brandIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.brand);
  const categoryIndex = resolveHeaderIndex(headerIndex, HEADER_ALIASES.category);
  const subcategoryIndex = resolveHeaderIndex(
    headerIndex,
    HEADER_ALIASES.subcategory,
  );

  const getValue = (row: string[], index?: number) => {
    if (index === undefined) {
      return "";
    }
    return (row[index] ?? "").trim();
  };

  const items: ImportBaseProductsCsvV2Item[] = [];
  let skipped = 0;

  rows.slice(1).forEach((row, rowIndex) => {
    const code = getValue(row, codeIndex);
    const name = getValue(row, nameIndex);
    const barcode = getValue(row, barcodeIndex);
    const size = getValue(row, sizeIndex);
    const line = getValue(row, lineIndex);
    const brand = getValue(row, brandIndex);
    const category = getValue(row, categoryIndex);
    const subcategory = getValue(row, subcategoryIndex);

    if (!code && !name && !barcode && !size && !line && !brand && !category && !subcategory) {
      skipped += 1;
      return;
    }

    items.push({
      code,
      name,
      line: line || undefined,
      barcode: barcode || undefined,
      size: size || undefined,
      brand: brand || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      rowIndex,
    });
  });

  if (items.length === 0) {
    return { error: "Nenhuma linha valida encontrada no CSV." } as const;
  }

  return { items, skipped } as const;
};

export function BaseProductsImportCsvDialog({
  open,
  onOpenChange,
}: BaseProductsImportCsvDialogProps) {
  const importMutation = useImportBaseProductsCsv();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<BaseProductsImportResult | null>(null);
  const [localSkipped, setLocalSkipped] = useState<number | null>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
    setLocalSkipped(null);
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isImporting) {
      return;
    }
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
      toastError("Arquivo invalido", "Selecione um arquivo .csv.");
      return;
    }

    if (file.size > MAX_CSV_SIZE_BYTES) {
      toastError(
        "Arquivo muito grande",
        "O tamanho maximo permitido e 10MB.",
      );
      return;
    }

    setResult(null);
    setLocalSkipped(null);
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = parseCsvBaseProducts(text);
      if ("error" in parsed) {
        toastError("CSV invalido", parsed.error);
        return;
      }

      setLocalSkipped(parsed.skipped);
      const response = await importMutation.mutateAsync(parsed.items);
      setResult(response);

      if (response.failed === 0) {
        toastSuccess("Importacao concluida");
        resetState();
        onOpenChange(false);
      } else {
        toastError(
          "Importacao concluida com erros",
          "Algumas linhas nao puderam ser importadas.",
        );
      }
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description);
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
      failed: result.failed,
      errors: result.errors ?? [],
    };
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Importe a Base Geral com colunas em PT-BR (com compatibilidade de aliases antigos).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="csv-base-products" className="cursor-pointer">
              Arquivo CSV
            </Label>
            <Input
              id="csv-base-products"
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
                Falhas: <strong>{summary.failed}</strong>
              </p>
              {typeof localSkipped === "number" ? (
                <p>
                  Ignorados localmente (linhas vazias): <strong>{localSkipped}</strong>
                </p>
              ) : null}
              {summary.errors.length > 0 ? (
                <div className="space-y-1 text-xs">
                  <p>Exemplos de erros:</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {summary.errors.slice(0, 5).map((item) => (
                      <li key={`${item.index}-${item.code}-${item.errorCode}`}>
                        Linha {item.index + 1}: {item.code || "(sem codigo)"} -{" "}
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
          <Button type="button" onClick={handleImport} disabled={isImporting}>
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
