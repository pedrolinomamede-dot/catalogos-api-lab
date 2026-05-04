"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";

import type { DataQualityIssueType } from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api/error";
import {
  useDataQualityIssuesV2,
  useDataQualitySummaryV2,
} from "@/lib/api/hooks";
import { downloadDataQualityIssuesCsvV2 } from "@/lib/api/v2/data-quality";
import { toastError } from "@/lib/ui/toast";

const PAGE_SIZE = 50;

const ISSUE_LABELS: Record<DataQualityIssueType, string> = {
  missing_sku: "Sem SKU",
  duplicate_sku: "SKU duplicado",
  missing_price: "Sem preco",
  missing_image: "Sem imagem",
  missing_category: "Sem categoria",
  missing_subcategory: "Sem subcategoria",
  missing_description: "Sem descricao",
  possible_duplicate_category: "Possivel duplicidade de categoria",
  possible_duplicate_subcategory: "Possivel duplicidade de subcategoria",
};

const ISSUE_ORDER = Object.keys(ISSUE_LABELS) as DataQualityIssueType[];

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function DataQualityPageClient() {
  const [issueType, setIssueType] = useState<DataQualityIssueType>("missing_sku");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const summaryQuery = useDataQualitySummaryV2();
  const issuesQuery = useDataQualityIssuesV2({
    type: issueType,
    page,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    setPage(1);
  }, [issueType]);

  const summary = summaryQuery.data;
  const issues = issuesQuery.data?.data ?? [];
  const meta = issuesQuery.data?.meta;

  const orderedCards = useMemo(() => {
    return ISSUE_ORDER.map((type) => ({
      type,
      label: ISSUE_LABELS[type],
      count: summary?.issueCounts[type] ?? 0,
    }));
  }, [summary]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await downloadDataQualityIssuesCsvV2(issueType);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `data-quality-${issueType}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Falha ao exportar CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  if (summaryQuery.isLoading) {
    return <LoadingState label="Carregando qualidade dos dados" />;
  }

  if (summaryQuery.isError || !summary) {
    const message = getErrorMessage(summaryQuery.error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar a analise da Base Geral."}
        icon={ShieldAlert}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Produtos analisados</p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalProducts}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Categorias analisadas</p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalCategories}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Subcategorias analisadas</p>
          <p className="mt-2 text-3xl font-semibold">{summary.totalSubcategories}</p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orderedCards.map((card) => (
          <button
            key={card.type}
            type="button"
            onClick={() => setIssueType(card.type)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              issueType === card.type
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            <p className="text-sm font-medium">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold">{card.count}</p>
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold">{ISSUE_LABELS[issueType]}</p>
            <p className="text-sm text-muted-foreground">
              Relatorio apenas de leitura com exportacao CSV.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>

        <div className="mt-5">
          {issuesQuery.isLoading ? (
            <LoadingState label="Carregando issues" />
          ) : issuesQuery.isError ? (
            <EmptyState
              title="Nao foi possivel carregar o relatorio"
              description={
                getErrorMessage(issuesQuery.error).description ?? "Tente novamente."
              }
            />
          ) : issues.length === 0 ? (
            <EmptyState
              title="Nenhum item encontrado"
              description="Nao ha ocorrencias para este tipo de analise no momento."
            />
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Normalizado</TableHead>
                    <TableHead>Ocorrencias</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((row) => (
                    <TableRow key={`${row.issueType}-${row.id}`}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.sku ?? "—"}</TableCell>
                      <TableCell>
                        {row.entityType === "product" ? (
                          <Badge variant="outline">
                            {row.sourceProvider
                              ? `${row.sourceType} / ${row.sourceProvider}`
                              : row.sourceType ?? "—"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{row.entityType}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.normalizedName ?? "—"}</TableCell>
                      <TableCell>{row.duplicateCount ?? "—"}</TableCell>
                      <TableCell>{formatDate(row.updatedAt)}</TableCell>
                      <TableCell>{row.details ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <ListPagination
                page={meta?.page ?? 1}
                totalPages={meta?.totalPages ?? 1}
                total={meta?.total ?? issues.length}
                pageSize={meta?.pageSize ?? PAGE_SIZE}
                isLoading={issuesQuery.isLoading}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
