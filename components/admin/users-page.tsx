"use client";

import { useMemo, useState } from "react";

import type { AppUserV2 } from "@/types/api";

import { EmptyState } from "@/components/admin/empty-state";
import { LoadingState } from "@/components/admin/loading-state";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
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
import { useMe, useUsersV2 } from "@/lib/api/hooks";

function formatRole(role: AppUserV2["role"]) {
  switch (role) {
    case "ADMIN":
      return "Administrador";
    case "SELLER":
      return "Vendedor";
    case "VIEWER":
      return "Visualizador";
    default:
      return role;
  }
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function UsersPageClient() {
  const { data: me, isLoading: isMeLoading, isError: isMeError, error: meError } = useMe();
  const { data, isLoading, isError, error, refetch } = useUsersV2();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserV2 | null>(null);

  const users = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (isMeLoading || isLoading) {
    return <LoadingState label="Carregando equipe" />;
  }

  if (isMeError) {
    const message = getErrorMessage(meError);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel validar o acesso."}
      />
    );
  }

  if (me?.role !== "ADMIN") {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Somente administradores podem gerenciar a equipe."
      />
    );
  }

  if (isError) {
    const message = getErrorMessage(error);
    return (
      <EmptyState
        title={message.title}
        description={message.description ?? "Nao foi possivel carregar a equipe."}
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
        <Button
          onClick={() => {
            setEditingUser(null);
            setDialogOpen(true);
          }}
        >
          Novo usuário
        </Button>
      </div>

      {!users.length ? (
        <EmptyState
          title="Nenhum usuário cadastrado"
          description="Crie vendedores e administradores para distribuir a operação comercial."
          action={
            <Button
              onClick={() => {
                setEditingUser(null);
                setDialogOpen(true);
              }}
            >
              Criar primeiro usuário
            </Button>
          }
        />
      ) : (
        <Card className="space-y-4 p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isCurrentUser = user.id === me.userId;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {user.name?.trim() || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                        {formatRole(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.whatsappPhone?.trim() || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "outline" : "secondary"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setDialogOpen(true);
                        }}
                      >
                        {isCurrentUser ? "Editar meu acesso" : "Editar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={editingUser}
      />
    </div>
  );
}
