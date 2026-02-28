"use client";

import { useMemo } from "react";

import type { Brand } from "@/types/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/api/error";
import { useBrand, useMe } from "@/lib/api/hooks";

type MeResponse = {
  userId: string;
  email: string | null;
  role: string;
  brandId: string;
};

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

  const {
    data: brand,
    isLoading: isBrandLoading,
    isError: isBrandError,
    error: brandError,
  } = useBrand(brandId);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marca atual</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome" value={brandData.name} />
        <Field label="Slug" value={brandData.slug} />
        <Field label="ID" value={brandData.id} />
      </CardContent>
    </Card>
  );
}
