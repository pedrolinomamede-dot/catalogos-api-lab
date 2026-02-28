"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CategoryFormDialog } from "@/components/admin/category-form-dialog";

export function CategoriesActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Nova categoria</Button>
      <CategoryFormDialog
        mode="create"
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
