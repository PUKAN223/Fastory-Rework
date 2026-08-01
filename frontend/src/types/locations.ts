export type Warehouse = {
  id: string;
  name: string;
  description: string;
  maxCapacity: number;
  productCount?: number;
  stockTotal?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWarehousePayload = {
  name: string;
  description: string;
  maxCapacity: number;
};
