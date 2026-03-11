"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ShareLinkV2 } from "@/types/api";
import type { PdfExportMode } from "@/types/api";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ListPagination } from "@/components/admin/list-pagination";
import { LoadingState } from "@/components/admin/loading-state";
import { ShareLinkFormDialog } from "@/components/admin/share-link-form-dialog";
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
import { getShareLinkDeleteImpactV2 } from "@/lib/api/v2/share-links";
import type { ShareLinkDeleteImpact } from "@/lib/api/v2/share-links";
import { copyTextToClipboard } from "@/lib/browser/copy-to-clipboard";
import {
  useDeleteShareLinkV2,
  useGenerateShareLinkPdfV2,
  useRevokeShareLinkV2,
  useShareLinkV2,
  useShareLinksV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const PAGE_SIZE = 100;

const buildShareLinkUrl = (identifier: string) => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/s/${identifier}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL;
  return fallback ? `${fallback}/s/${identifier}` : `/s/${identifier}`;
};

type ShareLinkRowProps = {
  shareLink: ShareLinkV2;
  isGenerating: boolean;
  onCopy: (shareLink: ShareLinkV2) => Promise<void>;
  onGenerate: (shareLink: ShareLinkV2, mode: PdfExportMode) => Promise<void>;
  onRevoke: (shareLink: ShareLinkV2) => void;
  onDelete: (shareLink: ShareLinkV2) => void;
};

function ShareLinkRow({
  shareLink,
  isGenerating,
  onCopy,
  onGenerate,
  onRevoke,
  onDelete,
}: ShareLinkRowProps) {
  const { data: detail } = useShareLinkV2(shareLink.id);
  const catalogLabel = useMemo(() => {
    const catalogs = detail?.catalogs ?? [];
    if (catalogs.length > 0) {
      const names = catalogs.map((catalog) => catalog.name).slice(0, 3);
      const suffix = catalogs.length > names.length ? "..." : "";
      return `${names.join(", ")}${suffix}`;
    }
    if (shareLink.catalogCount !== undefined) {
      return `${shareLink.catalogCount} catalogos`;
    }
    return "-";
  }, [detail?.catalogs, shareLink.catalogCount]);

  return (
    <TableRow key={shareLink.id}>
      <TableCell>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{shareLink.name}</p>
          <p className="text-xs text-muted-foreground">{shareLink.id}</p>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={
            shareLink.isRevoked
              ? "text-xs font-semibold text-muted-foreground"
              : "text-xs font-semibold text-emerald-600"
          }
        >
          {shareLink.isRevoked ? "Revogado" : "Ativo"}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {catalogLabel}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(shareLink.createdAt).toLocaleString("pt-BR")}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopy(shareLink)}
          >
            Copiar link
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onGenerate(shareLink, "final")}
            disabled={isGenerating}
          >
            {isGenerating ? "Gerando..." : "PDF final"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onGenerate(shareLink, "editavel")}
            disabled={isGenerating}
          >
            {isGenerating ? "Gerando..." : "PDF editavel"}
          </Button>
          {!shareLink.isRevoked ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRevoke(shareLink)}
            >
              Revogar
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(shareLink)}
          >
            Excluir
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ShareLinksPageClient() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useShareLinksV2({
    page,
    pageSize: PAGE_SIZE,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ShareLinkV2 | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShareLinkV2 | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteImpact, setDeleteImpact] = useState<ShareLinkDeleteImpact | null>(null);
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [isCheckingImpact, setIsCheckingImpact] = useState(false);
  const keepDeleteTargetRef = useRef(false);

  const revokeMutation = useRevokeShareLinkV2();
  const deleteMutation = useDeleteShareLinkV2();
  const generatePdfMutation = useGenerateShareLinkPdfV2();

  const shareLinks = useMemo(() => {
    const items = Array.isArray(data) ? data : data?.data ?? [];
    return items;
  }, [data]);
  const meta = Array.isArray(data) ? undefined : data?.meta;
  const total = meta?.total ?? shareLinks.length;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleCopy = async (shareLink: ShareLinkV2) => {
    const url = buildShareLinkUrl(shareLink.slug ?? shareLink.token);
    try {
      await copyTextToClipboard(url);
      toastSuccess("Link copiado");
    } catch {
      toastError("Falha ao copiar", "Copie manualmente: " + url);
    }
  };

  const handleGeneratePdf = async (shareLink: ShareLinkV2, mode: PdfExportMode) => {
    setGeneratingId(shareLink.id);
    try {
      const blob = await generatePdfMutation.mutateAsync({
        shareLinkId: shareLink.id,
        mode,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        mode === "editavel"
          ? `share-link-${shareLink.id}-editavel.pdf`
          : `share-link-${shareLink.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toastSuccess(mode === "editavel" ? "PDF editavel gerado" : "PDF gerado");
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    } finally {
      setGeneratingId(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Carregando links" />;
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar links."}
        action={
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>Novo share link</Button>
      </div>

      {!shareLinks.length ? (
        <EmptyState
          title="Nenhum share link criado"
          description="Crie um link para compartilhar catalogos com seus clientes."
          action={<Button onClick={() => setIsCreateOpen(true)}>Criar link</Button>}
        />
      ) : (
        <Card className="space-y-4 p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catalogos</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareLinks.map((shareLink) => (
                <ShareLinkRow
                  key={shareLink.id}
                  shareLink={shareLink}
                  isGenerating={generatingId === shareLink.id}
                  onCopy={handleCopy}
                  onGenerate={handleGeneratePdf}
                  onRevoke={(target) => {
                    setRevokeTarget(target);
                    setIsRevokeOpen(true);
                  }}
                  onDelete={(target) => {
                    setDeleteTarget(target);
                    setIsDeleteOpen(true);
                  }}
                />
              ))}
            </TableBody>
          </Table>
          <ListPagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={meta?.pageSize ?? PAGE_SIZE}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </Card>
      )}

      <ShareLinkFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open && !keepDeleteTargetRef.current) {
            setDeleteTarget(null);
          }
          if (!open) {
            keepDeleteTargetRef.current = false;
          }
        }}
        title="Excluir share link"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"?`
            : "Tem certeza que deseja excluir este share link?"
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending || isCheckingImpact}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          setIsCheckingImpact(true);
          try {
            const impact = await getShareLinkDeleteImpactV2(deleteTarget.id);
            if (impact.catalogsCount > 0) {
              keepDeleteTargetRef.current = true;
              setDeleteImpact(impact);
              setIsImpactOpen(true);
              return true;
            }

            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Share link excluido");
            setDeleteTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          } finally {
            setIsCheckingImpact(false);
          }
        }}
      />
      <ConfirmDialog
        open={isImpactOpen}
        onOpenChange={(open) => {
          setIsImpactOpen(open);
          if (!open) {
            setDeleteImpact(null);
            setDeleteTarget(null);
          }
        }}
        title="Confirmar exclusao com vinculos"
        description={
          deleteImpact
            ? `Este share link possui ${deleteImpact.catalogsCount} catalogos associados. A exclusao removera esses vinculos. Deseja continuar?`
            : "Este share link possui vinculos. Deseja continuar?"
        }
        confirmLabel="Excluir mesmo assim"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) {
            return false;
          }
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toastSuccess("Share link excluido");
            setDeleteImpact(null);
            setDeleteTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          }
        }}
      />

      <ConfirmDialog
        open={isRevokeOpen}
        onOpenChange={(open) => {
          setIsRevokeOpen(open);
          if (!open) {
            setRevokeTarget(null);
          }
        }}
        title="Revogar link"
        description={
          revokeTarget
            ? `Revogar o link "${revokeTarget.name}"?`
            : "Revogar o link selecionado?"
        }
        confirmLabel="Revogar"
        cancelLabel="Cancelar"
        confirmVariant="destructive"
        isLoading={revokeMutation.isPending}
        onConfirm={async () => {
          if (!revokeTarget) {
            return false;
          }
          try {
            await revokeMutation.mutateAsync(revokeTarget.id);
            toastSuccess("Link revogado");
            setIsRevokeOpen(false);
            setRevokeTarget(null);
            return true;
          } catch (err) {
            const message = getErrorMessage(err);
            toastError(message.title, message.description ?? "Tente novamente.");
            return false;
          }
        }}
      />
    </div>
  );
}
