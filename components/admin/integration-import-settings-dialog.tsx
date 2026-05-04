"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import type {
  IntegrationConnectionV2,
  UpdateIntegrationConnectionImportSettingsRequest,
} from "@/types/api";
import type { IntegrationImportSettings } from "@/lib/integrations/core/import-settings";

import {
  buildDefaultIntegrationImportSettings,
  normalizeIntegrationImportSettings,
} from "@/lib/integrations/core/import-settings";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api/error";
import {
  useUpdateIntegrationConnectionImportSettingsV2,
  useVarejonlineEntitiesV2,
  useVarejonlinePriceTablesV2,
} from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

const productFieldLabels: Array<{
  key: keyof IntegrationImportSettings["products"]["fields"];
  label: string;
}> = [
  { key: "name", label: "Nome" },
  { key: "description", label: "Descricao" },
  { key: "brand", label: "Marca" },
  { key: "line", label: "Linha" },
  { key: "unit", label: "Unidade" },
  { key: "barcode", label: "EAN principal" },
  { key: "additionalBarcodes", label: "EANs adicionais" },
  { key: "size", label: "Tamanho/medida" },
  { key: "attributes", label: "Grade e atributos" },
];

function parseReferenceList(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[,\n;]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function formatReferenceOption(item: { id: number; nome: string }) {
  return `${item.id} - ${item.nome}`;
}

function stripReferenceOptionPrefix(value: string) {
  const match = value.trim().match(/^(\d+)\s+-\s+.+$/);
  return match ? match[1] : value.trim();
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-md border border-input p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function FieldToggle({
  id,
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2 text-sm"
    >
      <span>{label}</span>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
    </label>
  );
}

function IntegrationImportSettingsForm({
  connection,
  onClose,
}: {
  connection: IntegrationConnectionV2;
  onClose: () => void;
}) {
  const updateMutation = useUpdateIntegrationConnectionImportSettingsV2();
  const priceTablesQuery = useVarejonlinePriceTablesV2(
    connection.id,
    connection.provider === "VAREJONLINE" && connection.status === "CONNECTED",
  );
  const entitiesQuery = useVarejonlineEntitiesV2(
    connection.id,
    connection.provider === "VAREJONLINE" && connection.status === "CONNECTED",
  );
  const [settings, setSettings] = useState<IntegrationImportSettings>(() =>
    normalizeIntegrationImportSettings(
      connection.importSettingsJson ?? buildDefaultIntegrationImportSettings(),
    ),
  );

  const isSaving = updateMutation.isPending;

  const handleSave = async () => {
    if (
      settings.pricing.enabled &&
      settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
      !settings.pricing.primaryPriceTableRef
    ) {
      toastError(
        "Tabela obrigatoria",
        "Informe o nome ou ID da tabela principal para usar preco por tabela.",
      );
      return;
    }

    if (
      settings.pricing.enabled &&
      settings.pricing.priceTablesMode === "SELECTED" &&
      settings.pricing.selectedPriceTableRefs.length === 0 &&
      !(
        settings.pricing.primarySource === "SELECTED_PRICE_TABLE" &&
        settings.pricing.primaryPriceTableRef
      )
    ) {
      toastError(
        "Tabelas obrigatorias",
        "Informe ao menos um nome ou ID de tabela para usar a leitura de tabelas selecionadas.",
      );
      return;
    }

    if (
      settings.inventory.enabled &&
      settings.inventory.importCurrentStock &&
      settings.inventory.currentStockSource === "SELECTED_ENTITY" &&
      !settings.inventory.stockEntityRef
    ) {
      toastError(
        "Entidade obrigatoria",
        "Informe o nome ou ID da entidade que alimenta o estoque principal.",
      );
      return;
    }

    const payload: UpdateIntegrationConnectionImportSettingsRequest = {
      importSettings: settings,
    };

    try {
      await updateMutation.mutateAsync({
        connectionId: connection.id,
        body: payload,
      });
      toastSuccess("Configuracao de leitura salva");
      onClose();
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-dashed border-input bg-muted/30 p-3 text-xs text-muted-foreground">
        Esta tela salva as preferencias de leitura por tenant para a
        integracao. Produtos, categorias, precos, estoque, imagens, fiscal e
        logistica passam a obedecer estas regras na proxima sincronizacao.
      </div>

      <SettingsSection
        title="Politica da sincronizacao"
        description="Escolha se a integracao pode atualizar produtos ja importados ou apenas criar novos registros vindos da Varejonline."
      >
        <div className="grid gap-2">
          <Label htmlFor="sync-policy-existing-products">
            Produtos ja importados
          </Label>
          <Select
            value={settings.syncPolicy.existingProductsMode}
            onValueChange={(
              value: IntegrationImportSettings["syncPolicy"]["existingProductsMode"],
            ) =>
              setSettings((current) => ({
                ...current,
                syncPolicy: {
                  ...current.syncPolicy,
                  existingProductsMode: value,
                },
              }))
            }
          >
            <SelectTrigger id="sync-policy-existing-products">
              <SelectValue placeholder="Selecione a politica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UPDATE_ENABLED_FIELDS">
                Atualizar produtos existentes com os campos marcados
              </SelectItem>
              <SelectItem value="CREATE_ONLY">
                Importar apenas produtos novos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          A opcao por produto na Base Geral pode bloquear a reimportacao mesmo
          quando a politica global permitir atualizacao.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Produtos"
        description="Escolha os campos principais do cadastro local que devem ser considerados na leitura da Varejonline."
      >
        <FieldToggle
          id="products-enabled"
          label="Importar dados de produtos"
          checked={settings.products.enabled}
          onCheckedChange={(checked) =>
            setSettings((current) => ({
              ...current,
              products: {
                ...current.products,
                enabled: checked,
              },
            }))
          }
        />
        <div className="grid gap-2 md:grid-cols-2">
          {productFieldLabels.map((field) => (
            <FieldToggle
              key={field.key}
              id={`products-${field.key}`}
              label={field.label}
              checked={settings.products.fields[field.key]}
              disabled={!settings.products.enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({
                  ...current,
                  products: {
                    ...current.products,
                    fields: {
                      ...current.products.fields,
                      [field.key]: checked,
                    },
                  },
                }))
              }
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Categorias"
        description="Defina como a taxonomia da Varejonline deve orientar a organizacao da Base Geral."
      >
        <FieldToggle
          id="categories-enabled"
          label="Importar classificacao local"
          checked={settings.categories.enabled}
          onCheckedChange={(checked) =>
            setSettings((current) => ({
              ...current,
              categories: {
                ...current.categories,
                enabled: checked,
              },
            }))
          }
        />
        <div className="grid gap-2">
          <Label htmlFor="categories-strategy">Estrategia atual</Label>
          <Select
            value={settings.categories.strategy}
            disabled={!settings.categories.enabled}
            onValueChange={(value: IntegrationImportSettings["categories"]["strategy"]) =>
              setSettings((current) => ({
                ...current,
                categories: {
                  ...current.categories,
                  strategy: value,
                },
              }))
            }
          >
            <SelectTrigger id="categories-strategy">
              <SelectValue placeholder="Selecione uma estrategia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GROUP_SUBGROUP">
                Grupo -&gt; Categoria / Subgrupo -&gt; Subcategoria
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <FieldToggle
            id="categories-metadata"
            label="Guardar departamento e setor como metadata"
            checked={settings.categories.storeDepartmentAndSectionAsMetadata}
            disabled={!settings.categories.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                categories: {
                  ...current.categories,
                  storeDepartmentAndSectionAsMetadata: checked,
                },
              }))
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Niveis fiscais e tributarios nunca entram na arvore de categorias do
          Catalogo Facil. Esses dados ficam apenas nos campos fiscais do produto.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Precos"
        description="Organize a leitura de preco padrao, custo e tabelas de preco para uso futuro no mapeamento."
      >
        <FieldToggle
          id="pricing-enabled"
          label="Importar dados de preco"
          checked={settings.pricing.enabled}
          onCheckedChange={(checked) =>
            setSettings((current) => ({
              ...current,
              pricing: {
                ...current.pricing,
                enabled: checked,
              },
            }))
          }
        />
        <div className="grid gap-2">
          <Label htmlFor="pricing-source">Origem do preco principal</Label>
          <Select
            value={settings.pricing.primarySource}
            disabled={!settings.pricing.enabled}
            onValueChange={(
              value: IntegrationImportSettings["pricing"]["primarySource"],
            ) =>
              setSettings((current) => ({
                ...current,
                pricing: {
                  ...current.pricing,
                  primarySource: value,
                },
              }))
            }
          >
            <SelectTrigger id="pricing-source">
              <SelectValue placeholder="Selecione a origem do preco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEFAULT_PRICE">Preco padrao do cadastro</SelectItem>
              <SelectItem value="SELECTED_PRICE_TABLE">
                Tabela de preco especifica
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pricing-tables-mode">Leitura de tabelas de preco</Label>
          <Select
            value={settings.pricing.priceTablesMode}
            disabled={!settings.pricing.enabled}
            onValueChange={(
              value: IntegrationImportSettings["pricing"]["priceTablesMode"],
            ) =>
              setSettings((current) => ({
                ...current,
                pricing: {
                  ...current.pricing,
                  priceTablesMode: value,
                },
              }))
            }
          >
            <SelectTrigger id="pricing-tables-mode">
              <SelectValue placeholder="Selecione o modo de leitura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Nao importar tabelas</SelectItem>
              <SelectItem value="SELECTED">
                Importar tabelas por nome ou ID
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <FieldToggle
            id="pricing-cost"
            label="Importar custo"
            checked={settings.pricing.importCostPrice}
            disabled={!settings.pricing.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                pricing: {
                  ...current.pricing,
                  importCostPrice: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="pricing-discount"
            label="Importar markup/comissao/desconto"
            checked={settings.pricing.importDiscountRules}
            disabled={!settings.pricing.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                pricing: {
                  ...current.pricing,
                  importDiscountRules: checked,
                },
              }))
            }
          />
        </div>
        {connection.provider === "VAREJONLINE" ? (
          <datalist id={`price-table-options-${connection.id}`}>
            {(priceTablesQuery.data ?? [])
              .filter((item) => item.ativo !== false && item.disponivel !== false)
              .map((item) => (
                <option key={item.id} value={formatReferenceOption(item)} />
              ))}
          </datalist>
        ) : null}
        {settings.pricing.primarySource === "SELECTED_PRICE_TABLE" ? (
          <div className="grid gap-2">
            <Label htmlFor="pricing-primary-table-id">
              Nome ou ID da tabela principal
            </Label>
            <Input
              id="pricing-primary-table-id"
              list={`price-table-options-${connection.id}`}
              value={settings.pricing.primaryPriceTableRef ?? ""}
              disabled={!settings.pricing.enabled}
              placeholder="Ex.: 2 ou TABELA ATACADO"
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  pricing: {
                    ...current.pricing,
                    primaryPriceTableRef:
                      stripReferenceOptionPrefix(event.target.value) || null,
                  },
                }))
              }
            />
          </div>
        ) : null}
        {settings.pricing.priceTablesMode === "SELECTED" ? (
          <div className="grid gap-2">
          <Label htmlFor="pricing-table-ids">
            Nomes ou IDs de tabela de preco (separados por virgula)
          </Label>
          <Input
            id="pricing-table-ids"
            list={`price-table-options-${connection.id}`}
            value={settings.pricing.selectedPriceTableRefs.join(", ")}
            disabled={!settings.pricing.enabled}
            placeholder="Ex.: TABELA ATACADO, FILIAIS"
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                pricing: {
                  ...current.pricing,
                  selectedPriceTableRefs: parseReferenceList(
                    event.target.value,
                  ).map(stripReferenceOptionPrefix),
                },
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Informe nomes ou IDs das tabelas que o Catalogo Facil deve solicitar
            a Varejonline, como atacado e outras tabelas comerciais.
          </p>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          O preco principal e as tabelas selecionadas ja obedecem esta
          configuracao na proxima sincronizacao.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Estoque"
        description="Controle quais informacoes de estoque entram no cadastro local."
      >
        <FieldToggle
          id="inventory-enabled"
          label="Importar dados de estoque"
          checked={settings.inventory.enabled}
          onCheckedChange={(checked) =>
            setSettings((current) => ({
              ...current,
              inventory: {
                ...current.inventory,
                enabled: checked,
              },
            }))
          }
        />
        <div className="grid gap-2 md:grid-cols-2">
          <FieldToggle
            id="inventory-current"
            label="Estoque atual"
            checked={settings.inventory.importCurrentStock}
            disabled={!settings.inventory.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                inventory: {
                  ...current.inventory,
                  importCurrentStock: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="inventory-min-max"
            label="Estoque minimo e maximo"
            checked={settings.inventory.importMinMax}
            disabled={!settings.inventory.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                inventory: {
                  ...current.inventory,
                  importMinMax: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="inventory-method"
            label="Metodo de controle"
            checked={settings.inventory.importControlMethod}
            disabled={!settings.inventory.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                inventory: {
                  ...current.inventory,
                  importControlMethod: checked,
                },
              }))
            }
          />
        </div>
        {settings.inventory.importCurrentStock ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="inventory-stock-source">Origem do estoque atual</Label>
              <Select
                value={settings.inventory.currentStockSource}
                disabled={!settings.inventory.enabled}
                onValueChange={(
                  value: IntegrationImportSettings["inventory"]["currentStockSource"],
                ) =>
                  setSettings((current) => ({
                    ...current,
                    inventory: {
                      ...current.inventory,
                      currentStockSource: value,
                    },
                  }))
                }
              >
                <SelectTrigger id="inventory-stock-source">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT_PAYLOAD">
                    Payload do produto
                  </SelectItem>
                  <SelectItem value="SELECTED_ENTITY">
                    Entidade especifica
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <datalist id={`entity-options-${connection.id}`}>
              {(entitiesQuery.data ?? []).map((item) => (
                <option key={item.id} value={formatReferenceOption(item)} />
              ))}
            </datalist>
            {settings.inventory.currentStockSource === "SELECTED_ENTITY" ? (
              <div className="grid gap-2">
                <Label htmlFor="inventory-stock-entity">
                  Nome ou ID da entidade de estoque
                </Label>
                <Input
                  id="inventory-stock-entity"
                  list={`entity-options-${connection.id}`}
                  value={settings.inventory.stockEntityRef ?? ""}
                  disabled={!settings.inventory.enabled}
                  placeholder="Ex.: 4 ou MAQUIADA MATRIZ"
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      inventory: {
                        ...current.inventory,
                        stockEntityRef:
                          stripReferenceOptionPrefix(event.target.value) || null,
                        stockBalanceType: "LIQUID",
                      },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  O estoque principal usara saldo liquido oficial da entidade
                  selecionada e preservara reservas na metadata.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Imagens"
        description="Defina se a leitura deve manter imagem principal e galeria."
      >
        <FieldToggle
          id="images-enabled"
          label="Importar imagens"
          checked={settings.images.enabled}
          onCheckedChange={(checked) =>
            setSettings((current) => ({
              ...current,
              images: {
                ...current.images,
                enabled: checked,
              },
            }))
          }
        />
        <div className="grid gap-2 md:grid-cols-2">
          <FieldToggle
            id="images-primary"
            label="Imagem principal"
            checked={settings.images.importPrimaryImage}
            disabled={!settings.images.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                images: {
                  ...current.images,
                  importPrimaryImage: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="images-gallery"
            label="Galeria"
            checked={settings.images.importGallery}
            disabled={!settings.images.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                images: {
                  ...current.images,
                  importGallery: checked,
                },
              }))
            }
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Fiscal e logistica"
        description="Escolha os blocos complementares que devem continuar disponiveis no cadastro local."
      >
        <div className="grid gap-2 md:grid-cols-2">
          <FieldToggle
            id="fiscal-enabled"
            label="Importar bloco fiscal"
            checked={settings.fiscal.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                fiscal: {
                  ...current.fiscal,
                  enabled: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="fiscal-classification"
            label="Classificacao, NCM, CEST, origem e FCI"
            checked={settings.fiscal.importTaxClassification}
            disabled={!settings.fiscal.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                fiscal: {
                  ...current.fiscal,
                  importTaxClassification: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="fiscal-metadata"
            label="Metadata fiscal adicional"
            checked={settings.fiscal.importTaxMetadata}
            disabled={!settings.fiscal.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                fiscal: {
                  ...current.fiscal,
                  importTaxMetadata: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="logistics-enabled"
            label="Importar bloco logistico"
            checked={settings.logistics.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                logistics: {
                  ...current.logistics,
                  enabled: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="logistics-weight"
            label="Peso"
            checked={settings.logistics.importWeight}
            disabled={!settings.logistics.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                logistics: {
                  ...current.logistics,
                  importWeight: checked,
                },
              }))
            }
          />
          <FieldToggle
            id="logistics-dimensions"
            label="Altura, largura e comprimento"
            checked={settings.logistics.importDimensions}
            disabled={!settings.logistics.enabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({
                ...current,
                logistics: {
                  ...current.logistics,
                  importDimensions: checked,
                },
              }))
            }
          />
        </div>
      </SettingsSection>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSaving}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar configuracao
        </Button>
      </DialogFooter>
    </div>
  );
}

type IntegrationImportSettingsDialogProps = {
  connection: IntegrationConnectionV2 | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntegrationImportSettingsDialog({
  connection,
  open,
  onOpenChange,
}: IntegrationImportSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar leitura</DialogTitle>
          <DialogDescription>
            Escolha quais informacoes da Varejonline devem compor a leitura do
            Catalogo Facil para este tenant.
          </DialogDescription>
        </DialogHeader>
        {connection ? (
          <IntegrationImportSettingsForm
            key={`${connection.id}-${open ? "open" : "closed"}`}
            connection={connection}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
