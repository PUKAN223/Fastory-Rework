import { beforeEach, describe, expect, it, vi } from "vitest";
import reducer, {
  createStore,
  fetchStores,
  type Store,
  setActiveStore,
} from "@/features/storeSlice";

const mockStore: Store = {
  id: 1,
  name: "Test Store",
  slug: "test-store",
  description: "A test store",
  icon: null,
  is_active: true,
  jobTitle: "Owner",
  permissions: { "*": true },
};

const mockStore2: Store = {
  id: 2,
  name: "Second Store",
  slug: "second-store",
  description: null,
  icon: null,
  is_active: true,
  jobTitle: "Member",
  permissions: { "products:read": true },
};

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  removeItem: vi.fn((key: string) => storage.delete(key)),
  clear: vi.fn(() => storage.clear()),
  get length() {
    return storage.size;
  },
  key: vi.fn((_i: number) => null),
};
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", {});

describe("storeSlice", () => {
  const initialState = {
    stores: [],
    activeStoreId: null,
    loading: false,
    error: null,
  };

  beforeEach(() => {
    storage.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe("reducers", () => {
    it("should return initial state", () => {
      expect(reducer(undefined, { type: "unknown" })).toEqual(initialState);
    });

    it("should set active store", () => {
      const state = reducer(initialState, setActiveStore(1));
      expect(state.activeStoreId).toBe(1);
    });

    it("should clear active store", () => {
      const prev = { ...initialState, activeStoreId: 1 };
      const state = reducer(prev, setActiveStore(null));
      expect(state.activeStoreId).toBeNull();
    });
  });

  describe("fetchStores thunk", () => {
    it("should handle pending state", () => {
      const state = reducer(initialState, {
        type: fetchStores.pending.type,
      });
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("should handle fulfilled state", () => {
      const state = reducer(initialState, {
        type: fetchStores.fulfilled.type,
        payload: [mockStore, mockStore2],
      });
      expect(state.stores).toHaveLength(2);
      expect(state.loading).toBe(false);
      expect(state.activeStoreId).toBe(1);
    });

    it("should restore saved activeStoreId from localStorage", () => {
      storage.set("activeStoreId", "2");
      const state = reducer(initialState, {
        type: fetchStores.fulfilled.type,
        payload: [mockStore, mockStore2],
      });
      expect(state.activeStoreId).toBe(2);
    });

    it("should fallback to first store if saved ID not in list", () => {
      storage.set("activeStoreId", "999");
      const state = reducer(initialState, {
        type: fetchStores.fulfilled.type,
        payload: [mockStore, mockStore2],
      });
      expect(state.activeStoreId).toBe(1);
    });

    it("should handle rejected state", () => {
      const state = reducer(initialState, {
        type: fetchStores.rejected.type,
        payload: "Network error",
      });
      expect(state.loading).toBe(false);
      expect(state.error).toBe("Network error");
    });
  });

  describe("createStore thunk", () => {
    it("should add new store and set as active", () => {
      const prev = { ...initialState, stores: [mockStore] };
      const state = reducer(prev, {
        type: createStore.fulfilled.type,
        payload: mockStore2,
      });
      expect(state.stores).toHaveLength(2);
      expect(state.stores[1]).toEqual(mockStore2);
      expect(state.activeStoreId).toBe(2);
    });
  });
});
