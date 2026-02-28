"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BaseProductsImportImagesDialog } from "@/components/admin/base-products-import-images-dialog";
import { BaseProductsImportCsvDialog } from "@/components/admin/base-products-import-csv-dialog";

export function BaseProductsActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [importImagesOpen, setImportImagesOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          Importar CSV
        </Button>
        <Button variant="outline" onClick={() => setImportImagesOpen(true)}>
          Importar imagens (SKU)
        </Button>
      </div>
      <BaseProductsImportCsvDialog
        open={importOpen}
        onOpenChange={setImportOpen}
      />
      <BaseProductsImportImagesDialog
        open={importImagesOpen}
        onOpenChange={setImportImagesOpen}
      />
    </>
  );
}
