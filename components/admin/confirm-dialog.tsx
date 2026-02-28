"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | boolean | Promise<void | boolean>;
  confirmVariant?: "destructive" | "default";
  isLoading?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  confirmVariant = "destructive",
  isLoading,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const loading = Boolean(isLoading || isConfirming);

  const handleConfirm = async () => {
    if (loading) {
      return;
    }

    try {
      setIsConfirming(true);
      const result = await onConfirm();
      if (result === false) {
        return;
      }
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (loading) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (loading) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={loading}
            aria-busy={loading}
            onClick={handleConfirm}
          >
            {loading ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
