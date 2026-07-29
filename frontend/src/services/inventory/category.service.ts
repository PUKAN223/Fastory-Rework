import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/categoriesSlice";
import type { AppDispatch } from "@/store";
import type { CreateCategoryPayload } from "@/types/categories";

export async function createCategoryService(
  dispatch: AppDispatch,
  payload: CreateCategoryPayload,
) {
  await dispatch(createCategory(payload)).unwrap();
}

export async function updateCategoryService(
  dispatch: AppDispatch,
  id: string,
  payload: Partial<CreateCategoryPayload>,
) {
  await dispatch(updateCategory({ id, data: payload })).unwrap();
}

export async function deleteCategoryService(dispatch: AppDispatch, id: string) {
  await dispatch(deleteCategory(id)).unwrap();
}
