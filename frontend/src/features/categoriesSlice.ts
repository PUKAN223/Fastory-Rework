import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";
import type { Category, CreateCategoryPayload } from "@/types/categories";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type CategoriesState = {
  items: Category[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  updateStatus: AsyncStatus;
  deleteStatus: AsyncStatus;
  lastFetched: number | null;
  error: string | null;
};

type ApiCategory = {
  id?: number;
  store_id?: number;
  name?: string;
  description?: string | null;
  icon_id?: string | null;
  productCount?: number;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = {
  data?: ApiCategory[];
  categories?: ApiCategory[];
};

type ApiOneResponse = {
  data?: ApiCategory;
  category?: ApiCategory;
};

const initialState: CategoriesState = {
  items: [],
  fetchStatus: "idle",
  createStatus: "idle",
  updateStatus: "idle",
  deleteStatus: "idle",
  lastFetched: null,
  error: null,
};

const toSafeString = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
const toSafeNumber = (v: unknown, fb = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fb;

function normalizeCategory(raw: ApiCategory): Category {
  if (raw.id === undefined || raw.id === null) {
    throw new Error("Category id is missing in API response");
  }

  return {
    id: String(raw.id),
    name: toSafeString(raw.name, "Untitled"),
    description: toSafeString(raw.description, ""),
    icon: toSafeString(raw.icon_id, "box") as Category["icon"],
    productCount: toSafeNumber(raw.productCount, 0),
    createdAt: toSafeString(
      raw.created_at,
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    ),
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

const readApiList = (body: unknown): ApiCategory[] => {
  if (Array.isArray(body)) return body as ApiCategory[];
  if (body && typeof body === "object") {
    const b = body as ApiListResponse;
    return b.data ?? b.categories ?? [];
  }
  return [];
};

const readApiOne = (body: unknown): ApiCategory | null => {
  if (body && typeof body === "object") {
    if ("id" in (body as any)) return body as ApiCategory;
    const b = body as ApiOneResponse;
    return b.data ?? b.category ?? null;
  }
  return null;
};

async function okJson<T>(r: Response, fallbackError: string): Promise<T> {
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r, fallbackError));
  }
  return (await r.json().catch(() => ({}))) as T;
}

export const fetchCategories = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string }
>("categories/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/categories");
    const body = await okJson<unknown>(r, "Failed to fetch categories");
    return readApiList(body)
      .map((x) => {
        try {
          return normalizeCategory(x);
        } catch {
          return null;
        }
      })
      .filter((x): x is Category => x !== null);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch categories",
    );
  }
});

export const fetchCategoryById = createAsyncThunk<
  Category,
  string,
  { rejectValue: string }
>("categories/fetchById", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/categories/${id}`);
    const body = await okJson<unknown>(r, "Failed to fetch category");
    const raw = readApiOne(body);
    if (!raw) return rejectWithValue("Category data is missing");
    try {
      return normalizeCategory(raw);
    } catch {
      return rejectWithValue("Category data is invalid");
    }
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch category",
    );
  }
});

export const createCategory = createAsyncThunk<
  Category,
  CreateCategoryPayload,
  { rejectValue: string }
>("categories/create", async (payload, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/categories", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || undefined,
        icon_id: payload.icon,
      }),
    });

    const body = await okJson<unknown>(r, "Failed to create category");
    const raw = readApiOne(body);
    if (!raw) return rejectWithValue("Created category data is missing");

    try {
      return normalizeCategory(raw);
    } catch {
      return rejectWithValue("Created category data is invalid");
    }
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create category",
    );
  }
});

export const updateCategory = createAsyncThunk<
  Category,
  { id: string; data: Partial<CreateCategoryPayload> },
  { rejectValue: string }
>("categories/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        icon_id: data.icon ?? undefined,
      }),
    });

    const body = await okJson<unknown>(r, "Failed to update category");
    const raw = readApiOne(body);
    if (!raw) return rejectWithValue("Updated category data is missing");

    try {
      return normalizeCategory(raw);
    } catch {
      return rejectWithValue("Updated category data is invalid");
    }
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to update category",
    );
  }
});

export const deleteCategory = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("categories/delete", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/categories/${id}`, {
      method: "DELETE",
    });
    if (!r.ok)
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to delete category"),
      );
    return id;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to delete category",
    );
  }
});

const setPending = (
  state: CategoriesState,
  key: keyof Pick<
    CategoriesState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
) => {
  state[key] = "loading";
  state.error = null;
};

const setRejected = (
  state: CategoriesState,
  key: keyof Pick<
    CategoriesState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
  action: any,
) => {
  state[key] = "failed";
  state.error = action.payload ?? action.error?.message ?? "Unknown error";
};

export function isCategoriesStale(
  lastFetched: number | null,
  maxAgeMs = 15000,
): boolean {
  if (lastFetched === null) return true;
  return Date.now() - lastFetched > maxAgeMs;
}

const slice = createSlice({
  name: "categories",
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
    b.addCase(fetchCategories.pending, (s) => setPending(s, "fetchStatus"));
    b.addCase(fetchCategories.fulfilled, (s, a) => {
      s.items = a.payload;
      s.fetchStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(fetchCategories.rejected, (s, a) =>
      setRejected(s, "fetchStatus", a),
    );

    b.addCase(createCategory.pending, (s) => setPending(s, "createStatus"));
    b.addCase(createCategory.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
      s.createStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(createCategory.rejected, (s, a) =>
      setRejected(s, "createStatus", a),
    );

    b.addCase(updateCategory.pending, (s) => setPending(s, "updateStatus"));
    b.addCase(updateCategory.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => x.id === a.payload.id);
      if (i >= 0) s.items[i] = a.payload;
      s.updateStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(updateCategory.rejected, (s, a) =>
      setRejected(s, "updateStatus", a),
    );

    b.addCase(deleteCategory.pending, (s) => setPending(s, "deleteStatus"));
    b.addCase(deleteCategory.fulfilled, (s, a) => {
      s.items = s.items.filter((x) => x.id !== a.payload);
      s.deleteStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(deleteCategory.rejected, (s, a) =>
      setRejected(s, "deleteStatus", a),
    );

    b.addCase(fetchCategoryById.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => x.id === a.payload.id);
      if (i >= 0) s.items[i] = a.payload;
      else s.items.unshift(a.payload);
      s.lastFetched = Date.now();
    });
  },
});

export const { resetData: resetCategoriesData } = slice.actions;
export default slice.reducer;
