"use client";

import { Button } from "@/components/ui/button";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  isLoading = false,
  onPageChange,
}: ListPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const canGoPrevious = safePage > 1 && !isLoading;
  const canGoNext = safePage < safeTotalPages && !isLoading;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {from}-{to} de {total} itens
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(safePage - 1)}
        >
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Pagina {safePage} de {safeTotalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canGoNext}
          onClick={() => onPageChange(safePage + 1)}
        >
          Proxima
        </Button>
      </div>
    </div>
  );
}
