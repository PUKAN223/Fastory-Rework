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
  error: string | null;
};

type ApiProduct = {
  id?: number | string;
  sku?: string;
  category_id?: number | string;
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
  if (raw.category_id === undefined || raw.category_id === null) {
    throw new Error("Product category_id is missing in API response");
  }

  const rawImageId = raw.image_id;

  return {
    id: String(raw.id),
    sku: toSafeString(raw.sku, ""),
    categoryId: String(raw.category_id),
    name: toSafeString(raw.name, "Untitled"),
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
  const body = (await response
    .clone()
    .json()
    .catch(() => ({}))) as {
    message?: string;
    error?: string;
  };
  return body.message ?? body.error ?? fallback;
}

const readApiList = (body: unknown): ApiProduct[] => {
  if (Array.isArray(body)) return body as ApiProduct[];
  if (body && typeof body === "object") {
    const b = body as ApiListResponse;
    return b.data ?? b.products ?? [];
  }
  return [];
};

const readApiOne = (body: unknown): ApiProduct | null => {
  if (body && typeof body === "object") {
    const obj = body as ApiProduct & {
      product?: ApiProduct;
      data?: ApiProduct;
    };
    if (obj.id !== undefined && obj.id !== null) {
      return obj;
    }
    return obj.product ?? obj.data ?? null;
  }
  return null;
};

async function okJson<T>(r: Response, fallbackError: string): Promise<T> {
  if (!r.ok) throw new Error(await parseErrorMessage(r, fallbackError));
  return (await r.json().catch(() => ({}))) as T;
}

export type FetchProductsParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
};

export const fetchProducts = createAsyncThunk<
  Product[],
  FetchProductsParams | undefined,
  { rejectValue: string }
>("products/fetchAll", async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.categoryId && params.categoryId !== "all") {
      query.set("category_id", params.categoryId);
    }

    const queryString = query.toString();
    const endpoint = queryString
      ? `/api/products?${queryString}`
      : "/api/products";
    const r = await requestWithRefresh(endpoint);
    const body = await okJson<unknown>(r, "Failed to fetch products");

    return readApiList(body)
      .map((x) => {
        try {
          return normalizeProduct(x);
        } catch {
          return null;
        }
      })
      .filter((x): x is Product => x !== null);
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
    const requestBody = {
      sku: payload.sku,
      category_id: Number(payload.categoryId),
      name: payload.name,
      description: payload.description || undefined,
      cost_price: payload.costPrice,
      selling_price: payload.sellingPrice,
      reorder_point: payload.reorderPoint,
      image_id: toOptionalImageIdNumber(payload.imageId),
      is_active: payload.isActive,
    };

    const r = await requestWithRefresh("/api/products", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    const body = await okJson<unknown>(r, "Failed to create product");
    const raw = readApiOne(body);
    if (!raw) {
      return rejectWithValue("Created product data is missing");
    }
    return normalizeProduct(raw);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create product",
    );
  }
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: string; data: Partial<CreateProductPayload> },
  { rejectValue: string }
>("products/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const requestBody = {
      sku: data.sku,
      category_id:
        data.categoryId !== undefined ? Number(data.categoryId) : undefined,
      name: data.name,
      description: data.description,
      cost_price: data.costPrice,
      selling_price: data.sellingPrice,
      reorder_point: data.reorderPoint,
      image_id: toOptionalImageIdNumber(data.imageId),
      is_active: data.isActive,
    };

    const r = await requestWithRefresh(`/api/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(requestBody),
    });
    const body = await okJson<unknown>(r, "Failed to update product");
    const raw = readApiOne(body);
    if (!raw) {
      return rejectWithValue("Updated product data is missing");
    }
    return normalizeProduct(raw);
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
    if (!r.ok) {
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to delete product"),
      );
    }
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
    });
    b.addCase(deleteProduct.rejected, (s, a) => {
      s.deleteStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });
  },
});

export const { resetData: resetProductsData } = slice.actions;
export default slice.reducer;
