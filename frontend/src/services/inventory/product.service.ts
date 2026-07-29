import { z } from "zod";
import { createImage, fetchImages } from "@/features/imageSlice";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/features/productsSlice";
import type { AppDispatch } from "@/store";
import type { CreateProductPayload } from "@/types/products";

const productCreateSchema = z.object({
  sku: z.string().trim().min(1),
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string(),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  isActive: z.boolean(),
  imageId: z.string().nullable().optional(),
  imageDataUrl: z.string().nullable().optional(),
});

const productUpdateSchema = productCreateSchema.partial();

type ProductUpdatePayload = Partial<CreateProductPayload>;

export async function createProductService(
  dispatch: AppDispatch,
  payload: CreateProductPayload,
) {
  const parsed = productCreateSchema.parse(payload);
  let imageId = parsed.imageId;

  if (parsed.imageDataUrl) {
    const createdImage = await dispatch(
      createImage({ url: parsed.imageDataUrl }),
    ).unwrap();
    imageId = createdImage.id;
  }

  await dispatch(
    createProduct({
      sku: parsed.sku,
      categoryId: parsed.categoryId,
      name: parsed.name,
      description: parsed.description,
      costPrice: parsed.costPrice,
      sellingPrice: parsed.sellingPrice,
      isActive: parsed.isActive,
      imageId: imageId ?? null,
    }),
  ).unwrap();

  if (parsed.imageDataUrl) {
    dispatch(fetchImages());
  }
}

export async function updateProductService(
  dispatch: AppDispatch,
  id: string,
  payload: ProductUpdatePayload,
) {
  const parsed = productUpdateSchema.parse(payload);
  let imageId = parsed.imageId;

  if (parsed.imageDataUrl) {
    const createdImage = await dispatch(
      createImage({ url: parsed.imageDataUrl }),
    ).unwrap();
    imageId = createdImage.id;
  }

  const updateData: ProductUpdatePayload = {
    sku: parsed.sku,
    categoryId: parsed.categoryId,
    name: parsed.name,
    description: parsed.description,
    costPrice: parsed.costPrice,
    sellingPrice: parsed.sellingPrice,
    isActive: parsed.isActive,
  };

  if (parsed.imageId === null) {
    updateData.imageId = null;
  } else if (imageId !== undefined) {
    updateData.imageId = imageId;
  }

  await dispatch(updateProduct({ id, data: updateData })).unwrap();

  if (parsed.imageDataUrl || parsed.imageId === null) {
    dispatch(fetchImages());
  }
}

export async function deleteProductService(dispatch: AppDispatch, id: string) {
  await dispatch(deleteProduct(id)).unwrap();
}
