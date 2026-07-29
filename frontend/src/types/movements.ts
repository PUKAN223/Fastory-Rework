export type StockMovement = {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  productSku: string;
  delta: number;
  reason: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};
