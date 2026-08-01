"use client";

import React, { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { hasStorePermission } from "@/lib/permissions";
import { useAppSelector } from "@/store/hook";
import { AppLogo } from "@/components/ui/app-logo";
import { ChangelogModal } from "@/components/modals/ChangelogModal";
import { AppSidebar } from "./AppSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";

const ROUTE_PERMISSIONS: { prefix: string; permission: string }[] = [
  { prefix: "/inventory/products", permission: "products:read" },
  { prefix: "/inventory/categories", permission: "categories:read" },
  { prefix: "/inventory/warehouses", permission: "locations:read" },
  { prefix: "/inventory/movements", permission: "stocks:read" },
  { prefix: "/sales/pos", permission: "sales:write" },
  { prefix: "/sales/orders", permission: "sales:read" },
  { prefix: "/users", permission: "settings:read" },
  { prefix: "/reports", permission: "reports:read" },
  { prefix: "/settings", permission: "settings:read" },
];

const ROUTE_NAME_MAP: Record<string, string> = {
  dashboard: "แดชบอร์ด",
  inventory: "คลังสินค้า",
  products: "รายการสินค้า",
  categories: "หมวดหมู่สินค้า",
  warehouses: "ที่เก็บสินค้า",
  movements: "ประวัติสต็อก",
  sales: "การขาย",
  pos: "หน้าร้าน (POS)",
  orders: "ประวัติการขาย",
  reports: "รายงานสรุป",
  assistant: "ผู้ช่วย AI",
  stores: "จัดการร้านค้า",
  settings: "การตั้งค่าร้านค้า",
  users: "พนักงาน",
  list: "จัดการพนักงาน",
  logs: "ประวัติกิจกรรมพนักงาน",
};

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const authStatus = useAppSelector((state) => state.auth.status);
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStore = stores.find((s) => s.id === activeStoreId);
  const permissions = activeStore?.permissions;

  const matchedRoute = ROUTE_PERMISSIONS.find((r) =>
    pathname.startsWith(r.prefix),
  );
  const hasAccess =
    !matchedRoute || hasStorePermission(permissions, matchedRoute.permission);

  useEffect(() => {
    if (authStatus === "guest") {
      window.location.href = "/login";
    } else if (
      authStatus === "authed" &&
      activeStoreId === null &&
      pathname !== "/stores"
    ) {
      router.push("/stores");
    } else if (
      authStatus === "authed" &&
      activeStoreId !== null &&
      pathname === "/dashboard" &&
      hasStorePermission(permissions, "sales:write") &&
      !hasStorePermission(permissions, "reports:read")
    ) {
      router.push("/sales/pos");
    }
  }, [authStatus, activeStoreId, pathname, permissions, router]);

  if (authStatus === "idle" || authStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground animate-pulse">
            กำลังตรวจสอบสิทธิ์...
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "guest") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground animate-pulse">
            กำลังเปลี่ยนเส้นทางไปหน้าเข้าสู่ระบบ...
          </p>
        </div>
      </div>
    );
  }

  if (
    authStatus === "authed" &&
    activeStoreId === null &&
    pathname !== "/stores"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground animate-pulse">
            กำลังเปลี่ยนเส้นทาง...
          </p>
        </div>
      </div>
    );
  }

  const segments = pathname.split("/").filter(Boolean);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 flex flex-col min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background/85 backdrop-blur-md transition-[width,height] ease-linear px-4">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap">
                <BreadcrumbItem className="hidden md:block shrink-0">
                  <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                    <AppLogo size={20} className="text-xs font-semibold" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                {segments.map((part, index) => {
                  const href = `/${segments.slice(0, index + 1).join("/")}`;
                  const isLast = index === segments.length - 1;
                  const label =
                    ROUTE_NAME_MAP[part.toLowerCase()] ||
                    part.charAt(0).toUpperCase() + part.slice(1);

                  return (
                    <React.Fragment key={href}>
                      {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
                      <BreadcrumbItem className="shrink-0">
                        {isLast ? (
                          <BreadcrumbPage className="font-medium text-foreground">
                            {label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={href}>
                            {label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div
          className={`flex min-w-0 flex-1 flex-col gap-5 overflow-x-clip pb-[env(safe-area-inset-bottom)] ${pathname === "/sales/pos" ? "p-2 pt-2" : "p-4 sm:p-6 pt-4 sm:pt-6"}`}
        >
          {!hasAccess ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
                <ShieldAlert className="size-8" />
              </div>
              <h1 className="mb-2 text-2xl font-semibold tracking-tight">
                ไม่มีสิทธิ์เข้าถึงหน้านี้ (403 Forbidden)
              </h1>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                บัญชีของคุณในร้านค้านี้ไม่มีสิทธิ์เข้าถึงเมนูนี้ กรุณาติดต่อผู้จัดการร้านเพื่อปรับเปลี่ยนสิทธิ์
              </p>
              <Button
                onClick={() =>
                  router.push(
                    hasStorePermission(permissions, "sales:write")
                      ? "/sales/pos"
                      : "/dashboard",
                  )
                }
              >
                กลับสู่หน้าหลัก
              </Button>
            </div>
          ) : (
            children
          )}
        </div>
      </SidebarInset>
      <ChangelogModal />
    </SidebarProvider>
  );
}
