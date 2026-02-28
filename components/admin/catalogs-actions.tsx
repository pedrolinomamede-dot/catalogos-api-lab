"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CatalogFormDialog } from "@/components/admin/catalog-form-dialog";

export function CatalogsActions() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Novo catalogo</Button>
      <CatalogFormDialog mode="create" open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
