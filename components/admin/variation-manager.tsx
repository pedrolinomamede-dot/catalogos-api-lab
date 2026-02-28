"use client";

import { useEffect, useMemo, useState } from "react";

import type { ProductVariation } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type VariationDraft = {
  key: string;
  id?: string;
  variantType: string;
  variantValue: string;
  price: string;
  barcode: string;
};

type VariationManagerProps = {
  initialVariations?: ProductVariation[];
  onChange?: (variations: VariationDraft[]) => void;
};

const createKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `var-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mapVariation = (
  variation: ProductVariation,
  index: number,
): VariationDraft => ({
  key: variation.id ?? `variation-${index}`,
  id: variation.id,
  variantType: variation.variantType ?? "",
  variantValue: variation.variantValue ?? "",
  price: Number.isFinite(variation.price) ? String(variation.price) : "",
  barcode: variation.barcode ?? "",
});

export function VariationManager({
  initialVariations,
  onChange,
}: VariationManagerProps) {
  const [variations, setVariations] = useState<VariationDraft[]>(
    () => (initialVariations ?? []).map(mapVariation),
  );

  useEffect(() => {
    onChange?.(variations);
  }, [onChange, variations]);

  const hasInvalidVariations = useMemo(
    () =>
      variations.some((variation) => {
        const variantType = variation.variantType.trim();
        const variantValue = variation.variantValue.trim();
        const priceValue = variation.price.trim();
        const barcode = variation.barcode.trim();
        const hasAny = variantType || variantValue || priceValue || barcode;
        if (!hasAny) {
          return false;
        }
        const invalidTypeValue = Boolean(variantType) !== Boolean(variantValue);
        const price = Number(priceValue);
        const invalidPrice = !Number.isFinite(price);
        return invalidTypeValue || invalidPrice;
      }),
    [variations],
  );

  const handleChange = (
    key: string,
    field: keyof Omit<VariationDraft, "key">,
    value: string,
  ) => {
    setVariations((current) =>
      current.map((variation) =>
        variation.key === key ? { ...variation, [field]: value } : variation,
      ),
    );
  };

  const handleAdd = () => {
    setVariations((current) => [
      ...current,
      {
        key: createKey(),
        variantType: "",
        variantValue: "",
        price: "",
        barcode: "",
      },
    ]);
  };

  const handleRemove = (key: string) => {
    setVariations((current) => current.filter((item) => item.key !== key));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Variações</h3>
          <p className="text-xs text-muted-foreground">
            Gerencie as variações do produto que serão salvas no envio.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          Adicionar variação
        </Button>
      </div>

      {variations.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Nenhuma variação adicionada.
        </Card>
      ) : null}

      <div className="space-y-3">
        {variations.map((variation) => (
          <Card key={variation.key} className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <select
                  value={variation.variantType}
                  onChange={(event) =>
                    handleChange(variation.key, "variantType", event.target.value)
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione</option>
                  <option value="size">Tamanho</option>
                  <option value="color">Cor</option>
                  <option value="pack">Pacote</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Valor</Label>
                <Input
                  value={variation.variantValue}
                  onChange={(event) =>
                    handleChange(variation.key, "variantValue", event.target.value)
                  }
                  placeholder="Ex.: 2L"
                />
              </div>
              <div className="grid gap-2">
                <Label>Preço</Label>
                <Input
                  type="number"
                  value={variation.price}
                  onChange={(event) =>
                    handleChange(variation.key, "price", event.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Barcode</Label>
                <Input
                  value={variation.barcode}
                  onChange={(event) =>
                    handleChange(variation.key, "barcode", event.target.value)
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(variation.key)}
              >
                Remover
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {hasInvalidVariations ? (
        <p className="text-xs text-amber-500">
          Preencha tipo e valor das variações para evitar inconsistências.
        </p>
      ) : null}
    </div>
  );
}
