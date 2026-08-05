import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

export interface Store {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  jobTitle: string | null;
  permissions: Record<string, boolean>;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  receiptTaxId?: string | null;
  promptpayId?: string | null;
  productCount?: number;
  memberCount?: number;
}

type StoreState = {
  stores: Store[];
  activeStoreId: number | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

const STORAGE_KEY = "activeStoreId";

function loadActiveStoreId(): number | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v ? Number(v) : null;
}

function saveActiveStoreId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id !== null) {
    localStorage.setItem(STORAGE_KEY, String(id));
    if (typeof document !== "undefined") {
      document.cookie = `activeStoreId=${id}; path=/; max-age=2592000; SameSite=Lax`;
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof document !== "undefined") {
      document.cookie = "activeStoreId=; path=/; max-age=0; SameSite=Lax";
    }
  }
}

const init: StoreState = {
  stores: [],
  activeStoreId: null,
  loading: false,
  loaded: false,
  error: null,
};

const jsonSafe = async <T>(r: Response): Promise<T> => {
  try {
    return (await r.json()) as T;
  } catch {
    return {} as T;
  }
};

type StoresApiRes = {
  success?: boolean;
  message?: string;
  stores?: Store[];
  store?: Store;
};

export const fetchStores = createAsyncThunk<
  Store[],
  void,
  { rejectValue: string }
>("stores/fetch", async (_, { rejectWithValue }) => {
  const r = await fetch("/api/stores", { cache: "no-store" });
  const data = await jsonSafe<StoresApiRes>(r);

  if (!r.ok || !data.success || !data.stores) {
    return rejectWithValue(data.message ?? "Failed to fetch stores");
  }

  return data.stores;
});

export const createStore = createAsyncThunk<
  Store,
  { name: string; slug?: string; description?: string; icon?: string },
  { rejectValue: string }
>("stores/create", async (body, { rejectWithValue }) => {
  const r = await fetch("/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await jsonSafe<StoresApiRes>(r);

  if (!r.ok || !data.success || !data.store) {
    return rejectWithValue(data.message ?? "Failed to create store");
  }

  return data.store;
});

export const updateStore = createAsyncThunk<
  Store,
  {
    id: number;
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
    is_active?: boolean;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    receiptTaxId?: string | null;
    promptpayId?: string | null;
  },
  { rejectValue: string }
>("stores/update", async ({ id, ...body }, { rejectWithValue }) => {
  const r = await fetch(`/api/stores/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await jsonSafe<StoresApiRes>(r);

  if (!r.ok || !data.success || !data.store) {
    return rejectWithValue(data.message ?? "Failed to update store");
  }

  return data.store;
});

export const deleteStore = createAsyncThunk<
  number,
  { id: number; password?: string },
  { rejectValue: string }
>("stores/delete", async ({ id, password }, { rejectWithValue }) => {
  const r = await fetch(`/api/stores/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await jsonSafe<{ success?: boolean; message?: string }>(r);

  if (!r.ok || !data.success) {
    return rejectWithValue(data.message ?? "Failed to delete store");
  }

  return id;
});

const slice = createSlice({
  name: "stores",
  initialState: init,
  reducers: {
    setActiveStore(state, action: PayloadAction<number | null>) {
      state.activeStoreId = action.payload;
      saveActiveStoreId(action.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchStores.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchStores.fulfilled, (s, a) => {
      s.stores = a.payload;
      s.loading = false;
      s.loaded = true;
      const savedId = loadActiveStoreId();
      if (savedId && a.payload.some((st) => st.id === savedId)) {
        s.activeStoreId = savedId;
        saveActiveStoreId(savedId); // Fix: re-sync cookie on every page load/refresh
      } else if (a.payload.length > 0) {
        s.activeStoreId = a.payload[0].id;
        saveActiveStoreId(a.payload[0].id);
      }
    });
    b.addCase(fetchStores.rejected, (s, a) => {
      s.loading = false;
      s.loaded = true;
      s.error = a.payload ?? a.error.message ?? "Failed to fetch stores";
    });

    b.addCase(createStore.fulfilled, (s, a) => {
      s.stores.push(a.payload);
      s.activeStoreId = a.payload.id;
      saveActiveStoreId(a.payload.id);
    });

    b.addCase(updateStore.fulfilled, (s, a) => {
      const idx = s.stores.findIndex((st) => st.id === a.payload.id);
      if (idx !== -1) {
        // preserve the user permissions, since PATCH response doesn't return member permissions
        const currentJobTitle = s.stores[idx].jobTitle;
        const currentPermissions = s.stores[idx].permissions;
        s.stores[idx] = {
          ...a.payload,
          jobTitle: currentJobTitle,
          permissions: currentPermissions,
        };
      }
    });

    b.addCase(deleteStore.fulfilled, (s, a) => {
      s.stores = s.stores.filter((st) => st.id !== a.payload);
      if (s.activeStoreId === a.payload) {
        if (s.stores.length > 0) {
          s.activeStoreId = s.stores[0].id;
          saveActiveStoreId(s.stores[0].id);
        } else {
          s.activeStoreId = null;
          saveActiveStoreId(null);
        }
      }
    });
  },
});

export const { setActiveStore } = slice.actions;
export default slice.reducer;
