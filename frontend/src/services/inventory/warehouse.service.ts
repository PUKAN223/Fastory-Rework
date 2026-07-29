import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/features/locationsSlice";
import type { AppDispatch } from "@/store";
import type { CreateWarehousePayload } from "@/types/locations";

export async function createWarehouseService(
  dispatch: AppDispatch,
  payload: CreateWarehousePayload,
) {
  await dispatch(createLocation(payload)).unwrap();
}

export async function updateWarehouseService(
  dispatch: AppDispatch,
  id: string,
  payload: Partial<CreateWarehousePayload>,
) {
  await dispatch(updateLocation({ id, data: payload })).unwrap();
}

export async function deleteWarehouseService(
  dispatch: AppDispatch,
  id: string,
) {
  await dispatch(deleteLocation(id)).unwrap();
}
