import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";
import type { CreateProductPayload, Product } from "@/types/products";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type ProductsState = {
  items: Product[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  updateStatus: AsyncStatus;
  deleteStatus: AsyncStatus;
  lastFetched: number | null;
  error: string | null;
};

type ApiProduct = {
  id?: number | string;
  sku?: string;
  category_id?: number | string;
  location_id?: number | string | null;
  name?: string;
  description?: string | null;
  cost_price?: number | string;
  selling_price?: number | string;
  image_id?: number | string | null;
  is_active?: boolean;
  stock_on_hand?: number | string;
  reorder_point?: number | string;
  stock_updated_at?: string;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = {
  data?: ApiProduct[];
  products?: ApiProduct[];
};

const initialState: ProductsState = {
  items: [],
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  lastFetched: null,
  error: null,
};

const toSafeString = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);

const toSafeNumber = (v: unknown, fb = 0) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fb;
};

const toOptionalImageIdNumber = (value: unknown): number | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const numberValue =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return undefined;
  }

  return numberValue;
};

function normalizeProduct(raw: ApiProduct): Product {
  if (raw.id === undefined || raw.id === null) {
    throw new Error("Product id is missing in API response");
  }

  const rawImageId = toOptionalImageIdNumber(raw.image_id);

  return {
    id: String(raw.id),
    sku: toSafeString(raw.sku, ""),
    categoryId: String(raw.category_id ?? ""),
    locationId:
      raw.location_id === undefined || raw.location_id === null
        ? null
        : String(raw.location_id),
    name: toSafeString(raw.name, "Untitled Product"),
    description: toSafeString(raw.description, ""),
    costPrice: toSafeNumber(raw.cost_price, 0),
    sellingPrice: toSafeNumber(raw.selling_price, 0),
    imageId:
      rawImageId === undefined || rawImageId === null
        ? null
        : String(rawImageId),
    isActive: typeof raw.is_active === "boolean" ? raw.is_active : true,
    stockOnHand: toSafeNumber(raw.stock_on_hand, 0),
    reorderPoint: toSafeNumber(raw.reorder_point, 0),
    stockUpdatedAt: toSafeString(
      raw.stock_updated_at,
      new Date().toISOString(),
    ),
    createdAt: toSafeString(raw.created_at, new Date().toISOString()),
    updatedAt: toSafeString(raw.updated_at, new Date().toISOString()),
  };
}

async function parseErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    if (!text) return fallback;
    try {
      const body = JSON.parse(text);
      if (body.message) return body.message;
      if (body.error) return body.error;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

const readApiList = (body: unknown): ApiProduct[] => {
  if (Array.isArray(body)) return body as ApiProduct[];
  if (body && typeof body === "object") {
    const obj = body as ApiListResponse;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.products)) return obj.products;
  }
  return [];
};

export function isProductsStale(
  lastFetched: number | null,
  maxAgeMs = 15000,
): boolean {
  if (lastFetched === null) return true;
  return Date.now() - lastFetched > maxAgeMs;
}

export const fetchProducts = createAsyncThunk<
  Product[],
  void,
  { rejectValue: string }
>("products/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/products");
    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to fetch products"));

    const body = await r.json().catch(() => ({}));
    const rawList = readApiList(body);

    return rawList
      .map((item) => {
        try {
          return normalizeProduct(item);
        } catch {
          return null;
        }
      })
      .filter((p): p is Product => p !== null);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch products",
    );
  }
});

export const createProduct = createAsyncThunk<
  Product,
  CreateProductPayload,
  { rejectValue: string }
>("products/create", async (payload, { rejectWithValue }) => {
  try {
    const cost = Number(payload.costPrice);
    const sell = Number(payload.sellingPrice);
    const reorder = Number(payload.reorderPoint ?? 0);
    const imageIdNum = toOptionalImageIdNumber(payload.imageId);

    const requestBody = {
      sku: payload.sku.trim(),
      name: payload.name.trim(),
      category_id: Number(payload.categoryId),
      location_id:
        payload.locationId != null ? Number(payload.locationId) : null,
      description: payload.description?.trim() || undefined,
      cost_price: Number.isNaN(cost) ? 0 : cost,
      selling_price: Number.isNaN(sell) ? 0 : sell,
      reorder_point: Number.isNaN(reorder) ? 0 : reorder,
      image_id: imageIdNum,
      is_active: payload.isActive ?? true,
    };

    const r = await requestWithRefresh("/api/products", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to create product"));

    const body = await r.json().catch(() => ({}));
    const rawProduct = body.product || body.data || body;

    if (!rawProduct || !rawProduct.id) {
      return rejectWithValue("Created product data is missing");
    }

    return normalizeProduct(rawProduct);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create product",
    );
  }
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: string; payload: Partial<CreateProductPayload> },
  { rejectValue: string }
>("products/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    const requestBody: Record<string, any> = {};

    if (payload.sku !== undefined) requestBody.sku = payload.sku.trim();
    if (payload.name !== undefined) requestBody.name = payload.name.trim();
    if (payload.categoryId !== undefined)
      requestBody.category_id = Number(payload.categoryId);
    if (payload.locationId !== undefined) {
      requestBody.location_id =
        payload.locationId != null ? Number(payload.locationId) : null;
    }
    if (payload.description !== undefined)
      requestBody.description = payload.description.trim();

    if (payload.costPrice !== undefined) {
      const c = Number(payload.costPrice);
      if (!Number.isNaN(c)) requestBody.cost_price = c;
    }

    if (payload.sellingPrice !== undefined) {
      const s = Number(payload.sellingPrice);
      if (!Number.isNaN(s)) requestBody.selling_price = s;
    }

    if (payload.reorderPoint !== undefined) {
      const rPoint = Number(payload.reorderPoint);
      if (!Number.isNaN(rPoint)) requestBody.reorder_point = rPoint;
    }

    if (payload.imageId !== undefined) {
      requestBody.image_id = toOptionalImageIdNumber(payload.imageId);
    }

    if (payload.isActive !== undefined)
      requestBody.is_active = payload.isActive;

    const r = await requestWithRefresh(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(requestBody),
    });

    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to update product"));

    const body = await r.json().catch(() => ({}));
    const rawProduct = body.product || body.data || body;

    if (!rawProduct || !rawProduct.id) {
      return rejectWithValue("Updated product data is missing");
    }

    return normalizeProduct(rawProduct);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to update product",
    );
  }
});

export const deleteProduct = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("products/delete", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/products/${id}`, {
      method: "DELETE",
    });

    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to delete product"));

    return id;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to delete product",
    );
  }
});

const slice = createSlice({
  name: "products",
  initialState,
  reducers: {
    resetData(state) {
      state.items = [];
      state.fetchStatus = "idle";
      state.createStatus = "idle";
      state.updateStatus = "idle";
      state.deleteStatus = "idle";
      state.lastFetched = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (s) => {
      s.fetchStatus = "loading";
      s.error = null;
    });
    b.addCase(fetchProducts.fulfilled, (s, a) => {
      s.items = a.payload;
      s.fetchStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(fetchProducts.rejected, (s, a) => {
      s.fetchStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(createProduct.pending, (s) => {
      s.createStatus = "loading";
      s.error = null;
    });
    b.addCase(createProduct.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
      s.createStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(createProduct.rejected, (s, a) => {
      s.createStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(updateProduct.pending, (s) => {
      s.updateStatus = "loading";
      s.error = null;
    });
    b.addCase(updateProduct.fulfilled, (s, a) => {
      const index = s.items.findIndex((item) => item.id === a.payload.id);
      if (index >= 0) {
        s.items[index] = a.payload;
      }
      s.updateStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(updateProduct.rejected, (s, a) => {
      s.updateStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(deleteProduct.pending, (s) => {
      s.deleteStatus = "loading";
      s.error = null;
    });
    b.addCase(deleteProduct.fulfilled, (s, a) => {
      s.items = s.items.filter((item) => item.id !== a.payload);
      s.deleteStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(deleteProduct.rejected, (s, a) => {
      s.deleteStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });
  },
});

export const { resetData: resetProductsData } = slice.actions;
export default slice.reducer;
