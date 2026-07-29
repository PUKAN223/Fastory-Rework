"use client";

import {
  ChartArea,
  Factory,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShelvingUnit,
  Sparkles,
  User,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { NavMain } from "@/components/Nav";
import { StoreSwitcher } from "@/components/StoreSwitcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { SidebarIconKey, SidebarNavItem } from "@/features/sidebarSlice";
import { fetchStores } from "@/features/storeSlice";
import { hasStorePermission } from "@/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { NavUser } from "./NavUser";

const iconMap: Record<SidebarIconKey, LucideIcon> = {
  factory: Factory,
  layoutDashboard: LayoutDashboard,
  shelvingUnit: ShelvingUnit,
  handCoins: HandCoins,
  user: User,
  chartArea: ChartArea,
  settings: Settings,
  sparkles: Sparkles,
};

function withIcons(items: SidebarNavItem[]) {
  return items.map((item) => ({
    ...item,
    icon: item.icon ? iconMap[item.icon] : undefined,
  }));
}

function filterNavItems(
  items: SidebarNavItem[],
  hasActiveStore: boolean,
  permissions?: Record<string, boolean>,
): SidebarNavItem[] {
  return items
    .filter((item) => {
      if (item.requiresStore && !hasActiveStore) return false;
      if (item.permission && !hasStorePermission(permissions, item.permission))
        return false;
      return true;
    })
    .map((item) => {
      const filteredSubItems = item.items?.filter((sub) => {
        if (sub.permission && !hasStorePermission(permissions, sub.permission))
          return false;
        return true;
      });
      return {
        ...item,
        items: filteredSubItems,
      };
    })
    .filter((item) => {
      if (
        item.items &&
        item.items.length === 0 &&
        item.url !== "/dashboard" &&
        item.url !== "/stores"
      ) {
        return false;
      }
      return true;
    });
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const auth = useAppSelector((state) => state.auth);
  const sidebar = useAppSelector((state) => state.sidebar);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const products = useAppSelector((state) => state.products.items);
  const dispatch = useAppDispatch();

  const hasActiveStore = activeStoreId !== null;

  useEffect(() => {
    if (auth.status === "authed") {
      dispatch(fetchStores());
    }
  }, [auth.status, dispatch]);

  // Count products where stock is at or below the reorder point
  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) => p.reorderPoint > 0 && p.stockOnHand <= p.reorderPoint,
      ).length,
    [products],
  );

  const stores = useAppSelector((state) => state.stores.stores);
  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId),
    [stores, activeStoreId],
  );
  const permissions = activeStore?.permissions;

  const visibleNavMain = filterNavItems(
    sidebar.navMain,
    hasActiveStore,
    permissions,
  ).map((item) => {
    // Inject low-stock badge on the inventory menu item
    if (item.url === "/inventory" && lowStockCount > 0) {
      return { ...item, badge: lowStockCount };
    }
    return item;
  });
  const visibleNavSystem = filterNavItems(
    sidebar.navSystem,
    hasActiveStore,
    permissions,
  );

  return (
    <Sidebar
      collapsible="icon"
      className="text-sidebar-foreground/85 **:data-[sidebar=separator]:bg-sidebar-border/50"
      {...props}
    >
      <SidebarHeader className="gap-3">
        <StoreSwitcher />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="gap-1">
        <NavMain
          currentPath={pathname}
          items={withIcons(visibleNavMain)}
          label="หน้าหลัก"
        />
        {visibleNavSystem.length > 0 && (
          <>
            <SidebarSeparator className="my-1" />
            <NavMain
              currentPath={pathname}
              items={withIcons(visibleNavSystem)}
              label="ระบบ"
            />
          </>
        )}
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        {auth.user && (
          <NavUser
            user={{
              name: auth.user.username,
              email: auth.user.email,
              avatar: auth.user.profile_picture_url ?? "",
            }}
          />
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
