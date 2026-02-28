"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { BaseProductV2 } from "@/types/api";

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
import { getErrorMessage } from "@/lib/api/error";
import { useAddCatalogItemsV2 } from "@/lib/api/hooks";
import { listBaseProducts } from "@/lib/api/v2/base-products";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type FoundSku = {
  sku: string;
  productBaseId: string;
  name: string;
};

type AnalyzeResult = {
  total: number;
  found: FoundSku[];
  missing: string[];
  ambiguous: string[];
};

type FailureResult = {
  sku: string;
  message: string;
};

type CatalogImportCsvDialogProps = {
  catalogId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_SKU_CONFIRMATION = 200;
const HEADER_TOKENS = new Set(["sku", "codigo", "código"]);
const NON_DIGITS_REGEX = /\D/g;

const normalizeSku = (value: string) => {
  const digits = value.replace(NON_DIGITS_REGEX, "");
  if (!digits) {
    return null;
  }
  if (digits.length > 4) {
    return digits.slice(-4);
  }
  return digits.padStart(4, "0");
};

const splitLine = (line: string) =>
  line
    .split(/[,;]/)
    .map((value) => value.replace(/^['\"]|['\"]$/g, "").trim());

const extractSkus = (content: string) => {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) {
    return [] as string[];
  }

  const firstRow = splitLine(lines[0]);
  const headerDetected = firstRow.some((token) =>
    HEADER_TOKENS.has(token.trim().toLowerCase()),
  );

  const dataLines = headerDetected ? lines.slice(1) : lines;
  const skuSet = new Set<string>();
  const skus: string[] = [];

  dataLines.forEach((line) => {
    const [firstValue] = splitLine(line);
    const rawSku = (firstValue ?? "").trim();
    if (!rawSku) {
      return;
    }
    const sku = normalizeSku(rawSku);
    if (!sku) {
      return;
    }
    const normalized = sku.toLowerCase();
    if (skuSet.has(normalized)) {
      return;
    }
    skuSet.add(normalized);
    skus.push(sku);
  });

  return skus;
};

export function CatalogImportCsvDialog({
  catalogId,
  open,
  onOpenChange,
}: CatalogImportCsvDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [skus, setSkus] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [failures, setFailures] = useState<FailureResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(false);

  const addItemsMutation = useAddCatalogItemsV2(catalogId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null);
      setSkus([]);
      setAnalysis(null);
      setFailures([]);
      setIsAnalyzing(false);
      setIsSubmitting(false);
      setConfirmLarge(false);
    }
    onOpenChange(nextOpen);
  };

  const handleAnalyze = async () => {
    if (!file) {
      toastError("Arquivo obrigatorio", "Selecione um arquivo CSV.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);
    setFailures([]);

    try {
      const content = await file.text();
      const extractedSkus = extractSkus(content);
      if (!extractedSkus.length) {
        toastError("CSV vazio", "Nenhum SKU valido foi encontrado.");
        setIsAnalyzing(false);
        return;
      }

      if (extractedSkus.length > MAX_SKU_CONFIRMATION && !confirmLarge) {
        setSkus(extractedSkus);
        setIsAnalyzing(false);
        return;
      }

      setSkus(extractedSkus);

      const results = await Promise.allSettled(
        extractedSkus.map(async (sku) => {
          const response = await listBaseProducts({ q: sku, page: 1, pageSize: 50 });
          const items = Array.isArray(response) ? response : response.data;
          const normalizedSku = normalizeSku(sku);
          if (!normalizedSku) {
            return { status: "missing" as const, sku };
          }
          const matches = items.filter(
            (item: BaseProductV2) =>
              normalizeSku(item.sku ?? "") === normalizedSku,
          );
          if (matches.length === 1) {
            const product = matches[0];
            return {
              status: "found" as const,
              sku,
              productBaseId: product.id,
              name: product.name,
            };
          }
          if (matches.length > 1) {
            return { status: "ambiguous" as const, sku };
          }
          return { status: "missing" as const, sku };
        }),
      );

      const found: FoundSku[] = [];
      const missing: string[] = [];
      const ambiguous: string[] = [];

      results.forEach((result, index) => {
        const sku = extractedSkus[index];
        if (result.status === "fulfilled") {
          if (result.value.status === "found") {
            found.push({
              sku: result.value.sku,
              productBaseId: result.value.productBaseId,
              name: result.value.name,
            });
          } else if (result.value.status === "ambiguous") {
            ambiguous.push(result.value.sku);
          } else {
            missing.push(result.value.sku);
          }
          return;
        }
        ambiguous.push(sku);
      });

      setAnalysis({
        total: extractedSkus.length,
        found,
        missing,
        ambiguous,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Falha ao analisar CSV.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!analysis || analysis.found.length === 0) {
      toastError("Nada para adicionar", "Nenhum SKU encontrado para adicionar.");
      return;
    }

    setIsSubmitting(true);
    setFailures([]);

    const result = await addItemsMutation.mutateAsync(
      analysis.found.map((item) => item.productBaseId),
    );

    if (!result.ok) {
      const failureList = result.failures.map((failure) => {
        const match = analysis.found.find(
          (item) => item.productBaseId === failure.productBaseId,
        );
        const message = getErrorMessage(failure.error);
        return {
          sku: match?.sku ?? failure.productBaseId,
          message: message.description ?? message.title,
        };
      });
      setFailures(failureList);
      toastError(
        "Alguns itens falharam",
        "Revise os SKUs com erro e tente novamente.",
      );
      setIsSubmitting(false);
      return;
    }

    toastSuccess("Itens adicionados ao catalogo");
    setIsSubmitting(false);
    handleOpenChange(false);
  };

  const totalSkus = skus.length;
  const hasLargeCsv = totalSkus > MAX_SKU_CONFIRMATION;

  const summary = useMemo(() => {
    if (!analysis) {
      return null;
    }
    return {
      total: analysis.total,
      found: analysis.found.length,
      missing: analysis.missing.length,
      ambiguous: analysis.ambiguous.length,
    };
  }, [analysis]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar CSV (SKUs)</DialogTitle>
          <DialogDescription>
            CSV deve conter uma coluna com SKU (uma linha por produto).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="file"
              accept=".csv"
              className="cursor-pointer file:cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isAnalyzing || isSubmitting}
            />
            {hasLargeCsv && !analysis ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                CSV com {totalSkus} SKUs. Confirme para continuar a validacao.
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmLarge}
                    onChange={(event) => setConfirmLarge(event.target.checked)}
                  />
                  Entendi e desejo continuar
                </label>
              </div>
            ) : null}
          </div>

          {summary ? (
            <div className="rounded-md border border-input p-3 text-sm">
              <div className="flex flex-wrap gap-4">
                <span>Total: {summary.total}</span>
                <span>Encontrados: {summary.found}</span>
                <span>Nao encontrados: {summary.missing}</span>
                <span>Ambiguos: {summary.ambiguous}</span>
              </div>
            </div>
          ) : null}

          {analysis?.missing.length ? (
            <details className="rounded-md border border-input p-3 text-xs">
              <summary className="cursor-pointer font-medium">
                SKUs nao encontrados ({analysis.missing.length})
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysis.missing.map((sku) => (
                  <span
                    key={sku}
                    className="rounded bg-muted px-2 py-1 text-muted-foreground"
                  >
                    {sku}
                  </span>
                ))}
              </div>
            </details>
          ) : null}

          {analysis?.ambiguous.length ? (
            <details className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <summary className="cursor-pointer font-medium">
                SKUs ambiguos ({analysis.ambiguous.length})
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {analysis.ambiguous.map((sku) => (
                  <span key={sku} className="rounded bg-white px-2 py-1">
                    {sku}
                  </span>
                ))}
              </div>
            </details>
          ) : null}

          {analysis?.found.length ? (
            <details className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <summary className="cursor-pointer font-medium">
                SKUs encontrados ({analysis.found.length})
              </summary>
              <div className="mt-2 space-y-1">
                {analysis.found.map((item) => (
                  <div key={item.productBaseId} className="flex justify-between">
                    <span>{item.sku}</span>
                    <span className="text-emerald-800">{item.name}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          {failures.length ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-semibold">Falhas ao adicionar:</p>
              <ul className="mt-2 space-y-1">
                {failures.map((failure) => (
                  <li key={failure.sku}>
                    {failure.sku}: {failure.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isAnalyzing || isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isSubmitting || !file || (hasLargeCsv && !confirmLarge)}
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Analisar CSV
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !analysis || analysis.found.length === 0}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Adicionar ao catalogo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
