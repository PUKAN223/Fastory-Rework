"use client";

import { useState } from "react";
import { ProductFormDrawer } from "@/components/forms/ProductFormDrawer";
import type { CreateProductPayload } from "@/types/products";

type ProductCategoryOption = {
  id: string;
  name: string;
};

type CreateProductDrawerProps = {
  categories: ProductCategoryOption[];
  onCreate: (payload: CreateProductPayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
};

export function CreateProductDrawer({
  categories,
  onCreate,
  isSubmitting = false,
}: CreateProductDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <ProductFormDrawer
      mode="create"
      open={open}
      categories={categories}
      onOpenChange={setOpen}
      onSubmit={onCreate}
      isSubmitting={isSubmitting}
      triggerLabel="เพิ่มสินค้า"
      triggerClassName="px-5 shadow-xs"
    />
  );
}
