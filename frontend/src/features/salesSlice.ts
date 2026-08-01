import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { requestWithRefresh } from "@/lib/request";
import type { Product } from "@/types/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: number;
  storeId: number;
  orderNumber: string;
  status: "completed" | "voided" | "pending";
  paymentMethod: "cash" | "promptpay";
  subtotal: number;
  discount: number;
  total: number;
  amountReceived: number | null;
  changeAmount: number | null;
  note: string | null;
  createdBy: number;
  creator?: { id: number; username: string };
  voidedBy: number | null;
  voider?: { id: number; username: string };
  voidedAt: string | null;
  createdAt: string;
  items: OrderItem[];
  promptpayPayload?: string | null;
}

export interface CheckoutPayload {
  items: { productId: number; quantity: number }[];
  paymentMethod: "cash" | "promptpay";
  amountReceived?: number;
  discount?: number;
  note?: string;
}

export interface DailySummary {
  totalOrders: number;
  totalRevenue: number;
  cashTotal: number;
  promptpayTotal: number;
  salesTrends?: { date: string; revenue: number }[];
  topProducts?: {
    productId: number;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}

type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

interface SalesState {
  // Cart State
  cartItems: CartItem[];
  paymentMethod: "cash" | "promptpay";
  amountReceived: number;
  discount: number;
  note: string;

  // Orders State
  orders: Order[];
  dailySummary: DailySummary | null;

  // Statuses
  fetchOrdersStatus: AsyncStatus;
  checkoutStatus: AsyncStatus;
  checkoutOrder: Order | null;
  voidStatus: AsyncStatus;
  fetchSummaryStatus: AsyncStatus;
  lastFetched: number | null;
  error: string | null;
}

const initialState: SalesState = {
  cartItems: [],
  paymentMethod: "cash",
  amountReceived: 0,
  discount: 0,
  note: "",
  checkoutStatus: "idle",
  checkoutOrder: null,

  orders: [],
  dailySummary: null,

  fetchOrdersStatus: "idle",
  voidStatus: "idle",
  fetchSummaryStatus: "idle",
  lastFetched: null,
  error: null,
};

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

// Normalize a raw snake_case order from the backend to our camelCase Order type
function normalizeOrder(order: any): Order {
  return {
    ...order,
    orderNumber: order.order_number ?? order.orderNumber,
    storeId: order.store_id ?? order.storeId,
    paymentMethod: order.payment_method ?? order.paymentMethod,
    amountReceived: order.amount_received ?? order.amountReceived,
    changeAmount: order.change_amount ?? order.changeAmount,
    createdBy: order.created_by ?? order.createdBy,
    createdAt: order.created_at ?? order.createdAt,
    voidedBy: order.voided_by ?? order.voidedBy,
    voidedAt: order.voided_at ?? order.voidedAt,
    creator: order.creator,
    voider: order.voider,
    promptpayPayload: order.promptpay_payload ?? order.promptpayPayload,
    status: order.status,
    items: (order.items ?? []).map((item: any) => ({
      id: item.id,
      productId: item.product_id ?? item.productId,
      productName: item.product_name ?? item.productName,
      productSku: item.product_sku ?? item.productSku,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price ?? item.unitPrice),
      totalPrice: Number(item.total_price ?? item.totalPrice),
    })),
  };
}

export const fetchOrders = createAsyncThunk<
  Order[],
  { limit?: number } | undefined,
  { rejectValue: string }
>("sales/fetchOrders", async (args, { rejectWithValue }) => {
  try {
    const query = args?.limit ? `?limit=${args.limit}` : "";
    const r = await requestWithRefresh(`/api/sales${query}`);
    if (!r.ok) {
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to fetch orders"),
      );
    }
    const data = await r.json();
    return (data.orders || []).map(normalizeOrder);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to fetch orders",
    );
  }
});

export const checkout = createAsyncThunk<
  Order,
  CheckoutPayload,
  { rejectValue: string }
>("sales/checkout", async (payload, { rejectWithValue }) => {
  try {
    // Generate order number: ORD-YYYYMMDD-XXXXXX
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderNumber = `ORD-${datePart}-${randPart}`;

    // Map camelCase → snake_case to match backend schema
    const body = {
      order_number: orderNumber,
      payment_method: payload.paymentMethod,
      discount: payload.discount ?? 0,
      amount_received: payload.amountReceived,
      note: payload.note,
      items: payload.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      })),
    };

    const r = await requestWithRefresh("/api/sales", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      return rejectWithValue(await parseErrorMessage(r, "Failed to checkout"));
    }
    const data = await r.json();
    return normalizeOrder({
      ...data.order,
      promptpayPayload: data.promptpayPayload,
    });
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to checkout",
    );
  }
});

export const voidOrder = createAsyncThunk<
  Order,
  number,
  { rejectValue: string }
>("sales/voidOrder", async (id, { rejectWithValue }) => {
  try {
    const r = await requestWithRefresh(`/api/sales/${id}/void`, {
      method: "POST",
    });
    if (!r.ok) {
      return rejectWithValue(
        await parseErrorMessage(r, "Failed to void order"),
      );
    }
    const data = await r.json();
    return normalizeOrder(data.order);
  } catch (e) {
    return rejectWithValue(
      e instanceof Error ? e.message : "Failed to void order",
    );
  }
});

export const fetchSummary = createAsyncThunk<
  DailySummary,
  void,
  { state: any; rejectValue: string }
>("sales/fetchSummary", async (_, { getState, rejectWithValue }) => {
  const state = getState();
  const storeId = state.stores.activeStoreId;
  if (!storeId) return rejectWithValue("No active store");

  const r = await requestWithRefresh(`/api/sales/${storeId}/summary`);
  const data = await r.json();

  if (!r.ok || !data.success) {
    return rejectWithValue(data.message ?? "Failed to fetch summary");
  }
  return data.summary;
});

const slice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<Product>) {
      const existing = state.cartItems.find(
        (item) => item.product.id === action.payload.id,
      );
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cartItems.push({ product: action.payload, quantity: 1 });
      }
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.cartItems = state.cartItems.filter(
        (item) => item.product.id !== action.payload,
      );
    },
    updateQuantity(
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) {
      const item = state.cartItems.find(
        (item) => item.product.id === action.payload.productId,
      );
      if (item && action.payload.quantity > 0) {
        item.quantity = action.payload.quantity;
      }
    },
    clearCart(state) {
      state.cartItems = [];
      state.paymentMethod = "cash";
      state.amountReceived = 0;
      state.discount = 0;
      state.note = "";
      state.checkoutStatus = "idle";
      state.checkoutOrder = null;
      state.error = null;
    },
    setPaymentMethod(state, action: PayloadAction<"cash" | "promptpay">) {
      state.paymentMethod = action.payload;
      if (action.payload === "promptpay") {
        state.amountReceived = 0;
      }
    },
    setAmountReceived(state, action: PayloadAction<number>) {
      state.amountReceived = action.payload;
    },
    setDiscount(state, action: PayloadAction<number>) {
      state.discount = action.payload;
    },
    setNote(state, action: PayloadAction<string>) {
      state.note = action.payload;
    },
    resetSalesData(state) {
      state.orders = [];
      state.dailySummary = null;
      state.fetchOrdersStatus = "idle";
      state.fetchSummaryStatus = "idle";
      state.checkoutStatus = "idle";
      state.voidStatus = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchOrders
    builder.addCase(fetchOrders.pending, (state) => {
      state.fetchOrdersStatus = "loading";
      state.error = null;
    });
    builder.addCase(fetchOrders.fulfilled, (state, action) => {
      state.fetchOrdersStatus = "succeeded";
      state.orders = action.payload;
      state.lastFetched = Date.now();
    });
    builder.addCase(fetchOrders.rejected, (state, action) => {
      state.fetchOrdersStatus = "failed";
      state.error = action.payload || "Failed to fetch orders";
    });

    // checkout
    builder.addCase(checkout.pending, (state) => {
      state.checkoutStatus = "loading";
      state.error = null;
    });
    builder.addCase(checkout.fulfilled, (state, action) => {
      state.checkoutStatus = "succeeded";
      state.checkoutOrder = action.payload;
      state.orders.unshift(action.payload);
      state.lastFetched = Date.now();
      if (state.dailySummary) {
        state.dailySummary.totalOrders += 1;
        state.dailySummary.totalRevenue += Number(action.payload.total);
        if (action.payload.paymentMethod === "cash") {
          state.dailySummary.cashTotal += Number(action.payload.total);
        } else {
          state.dailySummary.promptpayTotal += Number(action.payload.total);
        }
      }
    });
    builder.addCase(checkout.rejected, (state, action) => {
      state.checkoutStatus = "failed";
      state.error = action.payload || "Failed to checkout";
    });

    // voidOrder
    builder.addCase(voidOrder.pending, (state) => {
      state.voidStatus = "loading";
      state.error = null;
    });
    builder.addCase(voidOrder.fulfilled, (state, action) => {
      state.voidStatus = "succeeded";
      state.lastFetched = Date.now();
      const index = state.orders.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }

      // Update summary if possible (approximated for today)
      if (
        state.dailySummary &&
        new Date(action.payload.createdAt).toDateString() ===
          new Date().toDateString()
      ) {
        // Re-fetching summary is safer, but we can do a naive deduction
        state.dailySummary.totalOrders = Math.max(
          0,
          state.dailySummary.totalOrders - 1,
        );
        state.dailySummary.totalRevenue = Math.max(
          0,
          state.dailySummary.totalRevenue - Number(action.payload.total),
        );
        if (action.payload.paymentMethod === "cash") {
          state.dailySummary.cashTotal = Math.max(
            0,
            state.dailySummary.cashTotal - Number(action.payload.total),
          );
        } else {
          state.dailySummary.promptpayTotal = Math.max(
            0,
            state.dailySummary.promptpayTotal - Number(action.payload.total),
          );
        }
      }
    });
    builder.addCase(voidOrder.rejected, (s, a) => {
      s.voidStatus = "failed";
      s.error = a.payload ?? "Failed to void order";
    });

    // fetchSummary
    builder.addCase(fetchSummary.pending, (s) => {
      s.fetchSummaryStatus = "loading";
      s.error = null;
    });
    builder.addCase(fetchSummary.fulfilled, (s, a) => {
      s.fetchSummaryStatus = "succeeded";
      s.dailySummary = a.payload;
      s.lastFetched = Date.now();
    });
    builder.addCase(fetchSummary.rejected, (s, a) => {
      s.fetchSummaryStatus = "failed";
      s.error = a.payload ?? "Failed to fetch summary";
    });
  },
});

export function isSalesStale(
  lastFetched: number | null,
  maxAgeMs = 15000,
): boolean {
  if (lastFetched === null) return true;
  return Date.now() - lastFetched > maxAgeMs;
}

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  setPaymentMethod,
  setAmountReceived,
  setDiscount,
  setNote,
  resetSalesData,
} = slice.actions;

export default slice.reducer;
