import { describe, expect, it } from "vitest";
import reducer, { type SidebarNavItem } from "@/features/sidebarSlice";

describe("sidebarSlice", () => {
  it("should return initial state with nav items", () => {
    const state = reducer(undefined, { type: "unknown" });
    expect(state.navMain).toHaveLength(5);
    expect(state.navSystem).toHaveLength(2);
    expect(state.teams).toHaveLength(1);
  });

  it("should have requiresStore flag on store-dependent items", () => {
    const state = reducer(undefined, { type: "unknown" });

    const dashboardItem = state.navMain.find((i) => i.url === "/dashboard");
    expect(dashboardItem?.requiresStore).toBe(true);

    const inventoryItem = state.navMain.find((i) => i.url === "/inventory");
    expect(inventoryItem?.requiresStore).toBe(true);

    const salesItem = state.navMain.find((i) => i.url === "/sales");
    expect(salesItem?.requiresStore).toBe(true);

    const usersItem = state.navMain.find((i) => i.url === "/users");
    expect(usersItem?.requiresStore).toBe(true);
  });

  it("should NOT have requiresStore on stores page", () => {
    const state = reducer(undefined, { type: "unknown" });

    const storesItem = state.navMain.find((i) => i.url === "/stores");
    expect(storesItem?.requiresStore).toBeUndefined();
  });

  it("should filter store-dependent items correctly", () => {
    const state = reducer(undefined, { type: "unknown" });

    const filterByStore = (
      items: SidebarNavItem[],
      hasActiveStore: boolean,
    ): SidebarNavItem[] => {
      return items
        .filter((item) => !item.requiresStore || hasActiveStore)
        .map((item) => ({
          ...item,
          items: item.items?.filter(
            (_sub) => !item.requiresStore || hasActiveStore,
          ),
        }));
    };

    // With no active store, only "ร้านค้า" should remain
    const withoutStore = filterByStore(state.navMain, false);
    expect(withoutStore).toHaveLength(1);
    expect(withoutStore[0].url).toBe("/stores");

    // With active store, all items should remain
    const withStore = filterByStore(state.navMain, true);
    expect(withStore).toHaveLength(5);
  });

  it("should filter system nav items by store requirement", () => {
    const state = reducer(undefined, { type: "unknown" });

    const filterByStore = (
      items: SidebarNavItem[],
      hasActiveStore: boolean,
    ): SidebarNavItem[] => {
      return items.filter((item) => !item.requiresStore || hasActiveStore);
    };

    // Without store, system nav should be empty
    const withoutStore = filterByStore(state.navSystem, false);
    expect(withoutStore).toHaveLength(0);

    // With store, system nav should have all items
    const withStore = filterByStore(state.navSystem, true);
    expect(withStore).toHaveLength(2);
  });
});
