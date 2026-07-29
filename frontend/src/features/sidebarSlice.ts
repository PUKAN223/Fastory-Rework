import { createSlice } from "@reduxjs/toolkit";

export type SidebarIconKey =
  | "factory"
  | "layoutDashboard"
  | "shelvingUnit"
  | "handCoins"
  | "user"
  | "chartArea"
  | "settings"
  | "sparkles";

export type SidebarTeam = {
  name: string;
  logo: SidebarIconKey;
  plan: string;
};

export type SidebarNavItem = {
  title: string;
  url: string;
  icon?: SidebarIconKey;
  isActive?: boolean;
  defaultOpen?: boolean;
  requiresStore?: boolean;
  permission?: string;
  items?: {
    title: string;
    url: string;
    permission?: string;
  }[];
};

type SidebarState = {
  teams: SidebarTeam[];
  navMain: SidebarNavItem[];
  navSystem: SidebarNavItem[];
};

const initialState: SidebarState = {
  teams: [{ name: "Fastory", logo: "factory", plan: "ระบบจัดการสินค้า" }],
  navMain: [
    {
      title: "ร้านค้า",
      url: "/stores",
      icon: "factory",
    },
    {
      title: "แดชบอร์ด",
      url: "/dashboard",
      icon: "layoutDashboard",
      isActive: true,
      requiresStore: true,
      permission: "reports:read",
    },
    {
      title: "คลังสินค้า",
      url: "/inventory",
      icon: "shelvingUnit",
      defaultOpen: true,
      requiresStore: true,
      items: [
        {
          title: "สินค้า",
          url: "/inventory/products",
          permission: "products:read",
        },
        {
          title: "หมวดหมู่",
          url: "/inventory/categories",
          permission: "categories:read",
        },
        {
          title: "คลังสินค้า",
          url: "/inventory/warehouses",
          permission: "locations:read",
        },
        {
          title: "ประวัติสต็อก",
          url: "/inventory/movements",
          permission: "stocks:read",
        },
      ],
    },
    {
      title: "การขาย",
      url: "/sales",
      icon: "handCoins",
      defaultOpen: false,
      requiresStore: true,
      permission: "sales:read",
      items: [
        {
          title: "ขายสินค้า (POS)",
          url: "/sales/pos",
          permission: "sales:write",
        },
        {
          title: "ประวัติการขาย",
          url: "/sales/orders",
          permission: "sales:read",
        },
      ],
    },
    {
      title: "พนักงาน",
      url: "/users",
      icon: "user",
      requiresStore: true,
      permission: "settings:read",
      items: [
        {
          title: "จัดการพนักงาน",
          url: "/users/list",
          permission: "settings:read",
        },
      ],
    },
  ],
  navSystem: [
    {
      title: "ผู้ช่วย AI",
      url: "/ai-assistant",
      icon: "sparkles",
      requiresStore: true,
    },
    {
      title: "รายงาน",
      url: "/reports",
      icon: "chartArea",
      requiresStore: true,
      permission: "reports:read",
    },
    {
      title: "การตั้งค่า",
      url: "/settings",
      icon: "settings",
      requiresStore: true,
      permission: "settings:read",
    },
  ],
};

const slice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {},
});

export default slice.reducer;
