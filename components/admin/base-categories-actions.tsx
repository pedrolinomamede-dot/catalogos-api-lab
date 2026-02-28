"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BaseCategoryFormDialog } from "@/components/admin/base-category-form-dialog";

export function BaseCategoriesActions() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsCreateOpen(true)}>Nova categoria</Button>
      <BaseCategoryFormDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}
