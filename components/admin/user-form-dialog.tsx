"use client";

import { useEffect, useState } from "react";

import type { AppUserV2, CreateUserV2Request } from "@/types/api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useCreateUserV2, useUpdateUserV2 } from "@/lib/api/hooks";
import { toastError, toastSuccess } from "@/lib/ui/toast";

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUserV2 | null;
};

type FormRole = CreateUserV2Request["role"];

const DEFAULT_ROLE: FormRole = "SELLER";

export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: UserFormDialogProps) {
  const isEditing = Boolean(user);
  const createMutation = useCreateUserV2();
  const updateMutation = useUpdateUserV2();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<FormRole>(DEFAULT_ROLE);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole((user?.role as FormRole | undefined) ?? DEFAULT_ROLE);
    setWhatsappPhone(user?.whatsappPhone ?? "");
    setIsActive(user?.isActive ?? true);
  }, [open, user]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedWhatsapp = whatsappPhone.trim();

    if (!normalizedEmail) {
      toastError("Email obrigatório", "Informe o email do usuário.");
      return;
    }

    if (!isEditing && password.trim().length < 8) {
      toastError("Senha inválida", "A senha precisa ter ao menos 8 caracteres.");
      return;
    }

    try {
      if (isEditing && user) {
        await updateMutation.mutateAsync({
          id: user.id,
          data: {
            name: normalizedName || undefined,
            email: normalizedEmail,
            role,
            whatsappPhone: normalizedWhatsapp || null,
            isActive,
            password: password.trim() || undefined,
          },
        });
        toastSuccess("Usuário atualizado");
      } else {
        await createMutation.mutateAsync({
          name: normalizedName || undefined,
          email: normalizedEmail,
          password: password.trim(),
          role,
          whatsappPhone: normalizedWhatsapp || null,
          isActive,
        });
        toastSuccess("Usuário criado");
      }

      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err);
      toastError(message.title, message.description ?? "Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize perfil, role, WhatsApp e status de acesso."
              : "Crie um novo usuário administrativo ou vendedor para a marca atual."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do usuário"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="usuario@empresa.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-password">
              {isEditing ? "Nova senha" : "Senha"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isEditing ? "Preencha só para alterar" : "Mínimo de 8 caracteres"
              }
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-role">Perfil</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as FormRole)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELLER">Vendedor</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="user-whatsapp">WhatsApp</Label>
            <Input
              id="user-whatsapp"
              value={whatsappPhone}
              onChange={(event) => setWhatsappPhone(event.target.value)}
              placeholder="5599999999999"
              disabled={isSubmitting}
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border px-3 py-3">
            <Checkbox
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(Boolean(checked))}
              disabled={isSubmitting}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Usuário ativo</p>
              <p className="text-xs text-muted-foreground">
                Usuários inativos não conseguem fazer login.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
