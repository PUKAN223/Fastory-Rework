export type Warehouse = {
  id: string;
  name: string;
  description: string;
  maxCapacity: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateWarehousePayload = {
  name: string;
  description: string;
  maxCapacity: number;
};
