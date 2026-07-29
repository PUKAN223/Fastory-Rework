import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import authSlice from "@/features/authSlice";
import categoriesSlice, {
  fetchCategories,
  resetCategoriesData,
} from "@/features/categoriesSlice";
import imageSlice from "@/features/imageSlice";
import locationsSlice, {
  fetchLocations,
  resetLocationsData,
} from "@/features/locationsSlice";
import productsSlice, {
  fetchProducts,
  resetProductsData,
} from "@/features/productsSlice";
import salesReducer, {
  fetchOrders,
  fetchSummary,
  resetSalesData,
} from "@/features/salesSlice";
import sidebarSlice from "@/features/sidebarSlice";
import staffReducer, {
  fetchMembers,
  resetStaffData,
} from "@/features/staffSlice";
import stockMovementsSlice, {
  fetchMovements,
  resetMovementsData,
} from "@/features/stockMovementsSlice";
import storeSlice, { setActiveStore } from "@/features/storeSlice";

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  actionCreator: setActiveStore,
  effect: async (action, listenerApi) => {
    if (action.payload === null) return;
    // Reset all store-scoped data
    listenerApi.dispatch(resetProductsData());
    listenerApi.dispatch(resetCategoriesData());
    listenerApi.dispatch(resetLocationsData());
    listenerApi.dispatch(resetMovementsData());
    listenerApi.dispatch(resetStaffData());
    listenerApi.dispatch(resetSalesData());
    // Refetch data for new active store
    listenerApi.dispatch(fetchProducts());
    listenerApi.dispatch(fetchCategories());
    listenerApi.dispatch(fetchLocations());
    listenerApi.dispatch(fetchMovements());
    listenerApi.dispatch(fetchMembers(action.payload));
    listenerApi.dispatch(fetchOrders());
    listenerApi.dispatch(fetchSummary());
  },
});

export const store = configureStore({
  reducer: {
    auth: authSlice,
    categories: categoriesSlice,
    images: imageSlice,
    locations: locationsSlice,
    products: productsSlice,
    sidebar: sidebarSlice,
    stores: storeSlice,
    stockMovements: stockMovementsSlice,
    staff: staffReducer,
    sales: salesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
