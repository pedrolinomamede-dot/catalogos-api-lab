"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";
import { ProductsImportCsvDialog } from "@/components/admin/products-import-csv-dialog";

export function ProductsActions() {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={() => setImportOpen(true)}>
        Importar CSV
      </Button>
      <Button onClick={() => setOpen(true)}>Novo produto</Button>
      <ProductsImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      <ProductFormDialog mode="create" open={open} onOpenChange={setOpen} />
    </div>
  );
}
