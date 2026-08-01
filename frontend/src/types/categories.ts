import type { IconName } from "@/components/ui/icon-picker";

export type Category = {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  productCount: number;
  createdAt: string;
};

export type ProductCategory = Category;

export type CreateCategoryPayload = {
  name: string;
  description: string;
  icon: IconName;
};
