"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PdfThemeOption = "classic" | "dark_neon" | "glassmorphism";

type ThemeCard = {
  id: PdfThemeOption;
  label: string;
  description: string;
  colors: {
    bg: string;
    accent: string;
    card: string;
    text: string;
  };
};

const THEMES: ThemeCard[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Neumorfismo elegante com tons claros e sombras suaves.",
    colors: {
      bg: "#E2E7E9",
      accent: "#0B1B5E",
      card: "#FFFFFF",
      text: "#1A1A2E",
    },
  },
  {
    id: "dark_neon",
    label: "Dark Neon",
    description: "Visual cyberpunk com fundo escuro e brilho neon cyan.",
    colors: {
      bg: "#0A0A0B",
      accent: "#00F2FF",
      card: "#141416",
      text: "#00F2FF",
    },
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    description: "Paineis de vidro com aurora colorida e efeito blur.",
    colors: {
      bg: "#0F172A",
      accent: "#13C8EC",
      card: "rgba(255,255,255,0.15)",
      text: "#13C8EC",
    },
  },
];

type CatalogPdfThemeDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (theme: PdfThemeOption, mode: "final" | "editavel") => void;
  isExporting: boolean;
};

export function CatalogPdfThemeDialog({
  open,
  onClose,
  onConfirm,
  isExporting,
}: CatalogPdfThemeDialogProps) {
  const [selectedTheme, setSelectedTheme] = useState<PdfThemeOption>("classic");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolha o tema do PDF</DialogTitle>
          <DialogDescription>
            Selecione o estilo visual para exportar o catalogo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {THEMES.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                disabled={isExporting}
                onClick={() => setSelectedTheme(theme.id)}
                className={`group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                {/* Theme preview */}
                <div
                  className="relative flex h-24 items-end justify-center p-2"
                  style={{ backgroundColor: theme.colors.bg }}
                >
                  {/* Mini cards preview */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-6 rounded-sm"
                        style={{
                          backgroundColor: theme.colors.card,
                          border: `1px solid ${theme.colors.accent}40`,
                          boxShadow:
                            theme.id === "dark_neon"
                              ? `0 0 6px ${theme.colors.accent}30`
                              : "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      />
                    ))}
                  </div>
                  {/* Accent stripe */}
                  <div
                    className="absolute top-0 left-0 h-1.5 w-full"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                </div>

                {/* Label */}
                <div className="bg-background px-2 py-2 text-center">
                  <p className="text-xs font-semibold">{theme.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                    {theme.description}
                  </p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="bg-primary absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white">
                    ✓
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(selectedTheme, "editavel")}
            disabled={isExporting}
          >
            {isExporting ? "Gerando..." : "PDF Editavel"}
          </Button>
          <Button
            onClick={() => onConfirm(selectedTheme, "final")}
            disabled={isExporting}
          >
            {isExporting ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
