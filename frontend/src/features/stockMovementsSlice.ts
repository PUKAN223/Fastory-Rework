import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";
import type { StockMovement } from "@/types/movements";

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

type StockMovementsState = {
  items: StockMovement[];
  fetchStatus: AsyncStatus;
  createStatus: AsyncStatus;
  lastFetched: number | null;
  error: string | null;
};

const initialState: StockMovementsState = {
  items: [],
  fetchStatus: "idle",
  createStatus: "idle",
  lastFetched: null,
  error: null,
};

type ApiStockMovement = {
  id: number | string;
  store_id: number | string;
  product_id: number | string;
  delta: number;
  reason: string;
  note: string | null;
  created_by: number | string | null;
  created_at: string;
  products?: {
    id: number | string;
    name: string;
    sku: string;
  };
  users?: {
    id: number | string;
    username: string;
  };
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

function normalizeMovement(raw: ApiStockMovement): StockMovement {
  return {
    id: String(raw.id),
    storeId: String(raw.store_id),
    productId: String(raw.product_id),
    productName: toSafeString(raw.products?.name, "Unknown Product"),
    productSku: toSafeString(raw.products?.sku, ""),
    delta: toSafeNumber(raw.delta, 0),
    reason: toSafeString(raw.reason, ""),
    note: raw.note ?? null,
    createdBy: raw.users
      ? String(raw.users.username)
      : raw.created_by
        ? String(raw.created_by)
        : null,
    createdAt: toSafeString(raw.created_at, new Date().toISOString()),
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
      if (body.errors) {
        return `${body.message ?? "Validation Error"}: ${JSON.stringify(body.errors)}`;
      }
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export const fetchMovements = createAsyncThunk<
  StockMovement[],
  void,
  { rejectValue: string }
>("stockMovements/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh("/api/stocks/movements");
    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to fetch movements"));

    const body = await r.json().catch(() => ({}));
    const rawMovements = Array.isArray(body.movements)
      ? body.movements
      : Array.isArray(body)
        ? body
        : [];

    return rawMovements
      .map((x: ApiStockMovement) => {
        try {
          return normalizeMovement(x);
        } catch {
          return null;
        }
      })
      .filter((x: StockMovement | null): x is StockMovement => x !== null);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch movements",
    );
  }
});

export const createMovement = createAsyncThunk<
  StockMovement,
  { productId: string; delta: number; reason: string; note?: string },
  { rejectValue: string }
>("stockMovements/create", async (payload, { rejectWithValue }) => {
  try {
    const requestBody = {
      productId: Number(payload.productId),
      delta: payload.delta,
      reason: payload.reason,
      note: payload.note || undefined,
    };

    const r = await requestWithRefresh("/api/stocks/movements", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    if (!r.ok)
      throw new Error(await parseErrorMessage(r, "Failed to create movement"));

    const body = await r.json().catch(() => ({}));
    const raw = body.movement || body.data || body;

    if (!raw || !raw.id) {
      return rejectWithValue("Created movement data is missing");
    }
    return normalizeMovement(raw);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to create movement",
    );
  }
});

export function isStockMovementsStale(
  lastFetched: number | null,
  maxAgeMs = 15000,
): boolean {
  if (lastFetched === null) return true;
  return Date.now() - lastFetched > maxAgeMs;
}

const slice = createSlice({
  name: "stockMovements",
  initialState,
  reducers: {
    resetData(state) {
      state.items = [];
      state.fetchStatus = "idle";
      state.createStatus = "idle";
      state.lastFetched = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMovements.pending, (s) => {
      s.fetchStatus = "loading";
      s.error = null;
    });
    b.addCase(fetchMovements.fulfilled, (s, a) => {
      s.items = a.payload;
      s.fetchStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(fetchMovements.rejected, (s, a) => {
      s.fetchStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });

    b.addCase(createMovement.pending, (s) => {
      s.createStatus = "loading";
      s.error = null;
    });
    b.addCase(createMovement.fulfilled, (s, a) => {
      s.items.unshift(a.payload);
      s.createStatus = "succeeded";
      s.lastFetched = Date.now();
    });
    b.addCase(createMovement.rejected, (s, a) => {
      s.createStatus = "failed";
      s.error = a.payload ?? a.error.message ?? "Unknown error";
    });
  },
});

export const { resetData: resetMovementsData } = slice.actions;
export default slice.reducer;
