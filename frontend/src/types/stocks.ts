export type Stock = {
  productId: string;
  locationId: string;
  onHand: number;
  reorderPoint: number;
  updatedAt: string;
};

export type UpsertStockPayload = {
  productId: string;
  locationId: string;
  onHand: number;
  reorderPoint?: number;
  reason: string;
  note?: string;
};
