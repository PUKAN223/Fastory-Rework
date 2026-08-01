export type Product = {
  id: string;
  sku: string;
  categoryId: string;
  locationId: string | null;
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  imageId: string | null;
  isActive: boolean;
  stockOnHand: number;
  reorderPoint: number;
  stockUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductPayload = {
  sku: string;
  categoryId: string;
  locationId?: string | null;
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint?: number;
  isActive: boolean;
  imageId?: string | null;
  imageDataUrl?: string | null;
};

export type ProductFormMode = "create" | "edit";

export type ProductFormInitialValues = {
  sku: string;
  categoryId: string;
  locationId: string | null;
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  isActive: boolean;
  imageId: string | null;
  imageUrl: string | null;
};
