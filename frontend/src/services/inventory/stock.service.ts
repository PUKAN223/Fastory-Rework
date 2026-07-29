import type { AppDispatch } from "@/store";
import type { UpsertStockPayload } from "@/types/stocks";

export async function upsertStockService(
  _dispatch: AppDispatch,
  _payload: UpsertStockPayload,
) {
  // Stock upserts handled via product/movement services
}

export async function deleteStockService(
  _dispatch: AppDispatch,
  _payload: { productId: string; locationId: string },
) {
  // Stock deletions handled via product/movement services
}
