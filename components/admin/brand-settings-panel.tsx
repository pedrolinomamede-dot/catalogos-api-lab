"use client";

import { useMemo } from "react";

import type { Brand, MeResponse } from "@/types/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/error";
import { useBrand, useMe, useUpdateBrand } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const Field = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-semibold text-foreground">{value ?? "-"}</p>
  </div>
);

export function BrandSettingsPanel() {
  const {
    data: meData,
    isLoading: isMeLoading,
    isError: isMeError,
    error: meError,
  } = useMe();
  const me = meData as MeResponse | undefined;
  const brandId = me?.brandId ?? "";
  const canManageBrandAccess = me?.role === "SUPER_ADMIN";

  const {
    data: brand,
    isLoading: isBrandLoading,
    isError: isBrandError,
    error: brandError,
  } = useBrand(brandId);
  const updateBrand = useUpdateBrand(brandId);

  const errorMessage = useMemo(() => {
    if (isMeError) {
      return getErrorMessage(meError).title;
    }
    if (isBrandError) {
      return getErrorMessage(brandError).title;
    }
    return null;
  }, [brandError, isBrandError, isMeError, meError]);

  if (isMeLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marca atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (isMeError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marca atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Não foi possível carregar dados da marca.
          </p>
          {errorMessage ? (
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!brandId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marca atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seu usuário não está associado a uma marca.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isBrandLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marca atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (isBrandError || !brand) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marca atual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Não foi possível carregar dados da marca.
          </p>
          {errorMessage ? (
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const brandData = brand as Brand;

  async function handleToggleAccess() {
    try {
      const nextIsActive = !brandData.isActive;
      await updateBrand.mutateAsync({
        id: brandId,
        data: { isActive: nextIsActive },
      });

      toastSuccess(
        nextIsActive ? "Acesso do cliente reativado" : "Acesso do cliente suspenso",
        nextIsActive
          ? "Dashboard, site e share links voltaram a responder."
          : "Dashboard, site e share links foram bloqueados imediatamente.",
      );

      if (!nextIsActive && typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marca atual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Status de acesso do cliente</p>
            <p className="text-xs text-muted-foreground">
              {canManageBrandAccess
                ? "Suspender bloqueia dashboard, site público e share links da marca."
                : "O status da marca e gerenciado pelo administrador da plataforma."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={brandData.isActive ? "outline" : "secondary"}>
              {brandData.isActive ? "Ativa" : "Suspensa"}
            </Badge>
            {canManageBrandAccess ? (
              <Button
                type="button"
                variant={brandData.isActive ? "destructive" : "default"}
                onClick={handleToggleAccess}
                disabled={updateBrand.isPending}
              >
                {updateBrand.isPending
                  ? "Salvando..."
                  : brandData.isActive
                    ? "Suspender acesso"
                    : "Reativar acesso"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Nome" value={brandData.name} />
        <Field label="Slug" value={brandData.slug} />
        <Field label="ID" value={brandData.id} />
        <Field label="Status" value={brandData.isActive ? "Ativa" : "Suspensa"} />
        </div>
      </CardContent>
    </Card>
  );
}
