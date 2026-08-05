"use client";

import { useState } from "react";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import type { CreateProductPayload } from "@/types/products";

type ProductCategoryOption = {
  id: string;
  name: string;
};

type CreateProductModalProps = {
  categories: ProductCategoryOption[];
  onCreate: (payload: CreateProductPayload) => Promise<boolean> | boolean;
  isSubmitting?: boolean;
};

export function CreateProductModal({
  categories,
  onCreate,
  isSubmitting = false,
}: CreateProductModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <ProductFormModal
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
