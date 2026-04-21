"use client";

import { useState } from "react";

import type { CreatePlatformTenantRequest } from "@/types/api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/error";
import { useCreatePlatformTenant } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type PlatformTenantFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PlatformTenantFormDialog({
  open,
  onOpenChange,
}: PlatformTenantFormDialogProps) {
  const createTenant = useCreatePlatformTenant();
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandCnpj, setBrandCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminWhatsappPhone, setAdminWhatsappPhone] = useState("");

  function resetForm() {
    setBrandName("");
    setBrandSlug("");
    setBrandCnpj("");
    setLogoUrl("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminWhatsappPhone("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (
      !brandName.trim() ||
      !brandSlug.trim() ||
      !adminEmail.trim() ||
      adminPassword.trim().length < 8
    ) {
      toastError(
        "Campos obrigatórios",
        "Informe marca, slug, email do admin e uma senha com pelo menos 8 caracteres.",
      );
      return;
    }

    try {
      const payload: CreatePlatformTenantRequest = {
        brandName: brandName.trim(),
        brandSlug: brandSlug.trim().toLowerCase(),
        brandCnpj: brandCnpj.trim() || null,
        logoUrl: logoUrl.trim() || null,
        adminName: adminName.trim() || null,
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword: adminPassword.trim(),
        adminWhatsappPhone: adminWhatsappPhone.trim() || null,
      };

      await createTenant.mutateAsync(payload);
      toastSuccess("Cliente criado", payload.brandName);
      handleOpenChange(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Crie uma nova marca e o admin inicial do cliente em um fluxo único.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="brandName" className="text-sm font-medium">
              Nome da marca
            </label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(event) => setBrandName(event.target.value)}
              placeholder="Cliente Exemplo"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="brandSlug" className="text-sm font-medium">
              Slug da marca
            </label>
            <Input
              id="brandSlug"
              value={brandSlug}
              onChange={(event) => setBrandSlug(event.target.value)}
              placeholder="cliente-exemplo"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="brandCnpj" className="text-sm font-medium">
              CNPJ da empresa (opcional)
            </label>
            <Input
              id="brandCnpj"
              value={brandCnpj}
              onChange={(event) => setBrandCnpj(event.target.value)}
              placeholder="00.000.000/0001-00"
            />
            <p className="text-xs text-muted-foreground">
              Necessário para validar a conexão OAuth com a Varejonline.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="logoUrl" className="text-sm font-medium">
              Logo URL (opcional)
            </label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="adminName" className="text-sm font-medium">
                Nome do admin
              </label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(event) => setAdminName(event.target.value)}
                placeholder="Admin do cliente"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="adminWhatsapp" className="text-sm font-medium">
                WhatsApp do admin
              </label>
              <Input
                id="adminWhatsapp"
                value={adminWhatsappPhone}
                onChange={(event) => setAdminWhatsappPhone(event.target.value)}
                placeholder="5511999999999"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="adminEmail" className="text-sm font-medium">
                Email do admin
              </label>
              <Input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                placeholder="admin@cliente.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="adminPassword" className="text-sm font-medium">
                Senha inicial
              </label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createTenant.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createTenant.isPending}
          >
            {createTenant.isPending ? "Criando..." : "Criar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
