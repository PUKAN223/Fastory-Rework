import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";
import type { CreateWarehousePayload, Warehouse } from "@/types/locations";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type LocationsState = {
  items: Warehouse[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  updateStatus: AsyncStatus;
  deleteStatus: AsyncStatus;
  lastFetched: number | null;
  error: string | null;
};

type ApiLocation = {
  id?: number;
  name?: string;
  description?: string | null;
  max_capacity?: number;
  product_count?: number;
  stock_total?: number;
  created_at?: string;
  updated_at?: string;
};

type ApiListResponse = { data?: ApiLocation[]; locations?: ApiLocation[] };
type ApiOneResponse = { data?: ApiLocation; location?: ApiLocation };

const initialState: LocationsState = {
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

function normalizeLocation(raw: ApiLocation): Warehouse {
  if (raw.id === undefined || raw.id === null) {
    throw new Error("Location id is missing in API response");
  }

  return {
    id: String(raw.id),
    name: toSafeString(raw.name, "Untitled"),
    description: toSafeString(raw.description, ""),
    maxCapacity: toSafeNumber(raw.max_capacity, 0),
    productCount:
      typeof raw.product_count === "number" ? raw.product_count : undefined,
    stockTotal:
      typeof raw.stock_total === "number" ? raw.stock_total : undefined,
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

const readApiList = (body: unknown): ApiLocation[] => {
  if (Array.isArray(body)) return body as ApiLocation[];
  if (body && typeof body === "object") {
    const b = body as ApiListResponse;
    return b.data ?? b.locations ?? [];
  }
  return [];
};

const readApiOne = (body: unknown): ApiLocation | null => {
  if (body && typeof body === "object") {
    if ("id" in (body as any)) return body as ApiLocation;
    const b = body as ApiOneResponse;
    return b.data ?? b.location ?? null;
  }
  return null;
};

async function okJson<T>(r: Response, fallbackError: string): Promise<T> {
  if (!r.ok) {
    throw new Error(await parseErrorMessage(r, fallbackError));
  }
  return (await r.json().catch(() => ({}))) as T;
}

export const fetchLocations = createAsyncThunk<
  Warehouse[],
  void,
  { rejectValue: string }
>("locations/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/locations");
    const body = await okJson<unknown>(r, "Failed to fetch locations");

    return readApiList(body)
      .map((x) => {
        try {
          return normalizeLocation(x);
        } catch {
          return null;
        }
      })
      .filter((x): x is Warehouse => x !== null);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch locations",
    );
  }
});

export const createLocation = createAsyncThunk<
  Warehouse,
  CreateWarehousePayload,
  { rejectValue: string }
>("locations/create", async (payload, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/locations", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || undefined,
        max_capacity: payload.maxCapacity,
      }),
    });

    const body = await okJson<unknown>(r, "Failed to create location");
    const raw = readApiOne(body);
    if (!raw) return rejectWithValue("Created warehouse data is missing");

    try {
      return normalizeLocation(raw);
    } catch {
      return rejectWithValue("Created warehouse data is invalid");
    }
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create location",
    );
  }
});

export const updateLocation = createAsyncThunk<
  Warehouse,
  { id: string; data: Partial<CreateWarehousePayload> },
  { rejectValue: string }
>("locations/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/locations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        max_capacity: data.maxCapacity,
      }),
    });

    const body = await okJson<unknown>(r, "Failed to update location");
    const raw = readApiOne(body);
    if (!raw) return rejectWithValue("Updated warehouse data is missing");

    try {
      return normalizeLocation(raw);
    } catch {
      return rejectWithValue("Updated warehouse data is invalid");
    }
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to update location",
    );
  }
});

export const deleteLocation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("locations/delete", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/locations/${id}`, {
      method: "DELETE",
    });
    if (!r.ok)
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to delete location"),
      );
    return id;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to delete location",
    );
  }
});

export const forceDeleteLocation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("locations/forceDelete", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/locations/${id}?force=true`, {
      method: "DELETE",
    });
    if (!r.ok)
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to force delete location"),
      );
    return id;
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to force delete location",
    );
  }
});

const setPending = (
  state: LocationsState,
  key: keyof Pick<
    LocationsState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
) => {
  state[key] = "loading";
  state.error = null;
};

const setRejected = (
  state: LocationsState,
  key: keyof Pick<
    LocationsState,
    "fetchStatus" | "createStatus" | "updateStatus" | "deleteStatus"
  >,
  action: any,
) => {
  state[key] = "failed";
  state.error = action.payload ?? action.error?.message ?? "Unknown error";
};

export function isLocationsStale(
  lastFetched: number | null,
  maxAgeMs = 15000,
): boolean {
  if (lastFetched === null) return true;
  return Date.now() - lastFetched > maxAgeMs;
}

const slice = createSlice({
  name: "locations",
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
    b.addCase(fetchLocations.pending, (s) => setPending(s, "fetchStatus"));
    b.addCase(fetchLocations.fulfilled, (s, a) => {
      s.items = a.payload;
      s.fetchStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(fetchLocations.rejected, (s, a) =>
      setRejected(s, "fetchStatus", a),
    );

    b.addCase(createLocation.pending, (s) => setPending(s, "createStatus"));
    b.addCase(createLocation.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
      s.createStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(createLocation.rejected, (s, a) =>
      setRejected(s, "createStatus", a),
    );

    b.addCase(updateLocation.pending, (s) => setPending(s, "updateStatus"));
    b.addCase(updateLocation.fulfilled, (s, a) => {
      const i = s.items.findIndex((x) => x.id === a.payload.id);
      if (i >= 0) s.items[i] = a.payload;
      s.updateStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(updateLocation.rejected, (s, a) =>
      setRejected(s, "updateStatus", a),
    );

    b.addCase(deleteLocation.pending, (s) => setPending(s, "deleteStatus"));
    b.addCase(deleteLocation.fulfilled, (s, a) => {
      s.items = s.items.filter((x) => x.id !== a.payload);
      s.deleteStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(deleteLocation.rejected, (s, a) =>
      setRejected(s, "deleteStatus", a),
    );

    b.addCase(forceDeleteLocation.pending, (s) =>
      setPending(s, "deleteStatus"),
    );
    b.addCase(forceDeleteLocation.fulfilled, (s, a) => {
      s.items = s.items.filter((x) => x.id !== a.payload);
      s.deleteStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(forceDeleteLocation.rejected, (s, a) =>
      setRejected(s, "deleteStatus", a),
    );
  },
});

export const { resetData: resetLocationsData } = slice.actions;
export default slice.reducer;
