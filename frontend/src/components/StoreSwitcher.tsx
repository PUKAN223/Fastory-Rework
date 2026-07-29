"use client";

import { Check, ChevronsUpDown, Plus, Store } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { setActiveStore } from "@/features/storeSlice";
import { storeIconMap } from "@/lib/storeIcons";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { CreateStoreSheet } from "./AddStoreDialog";

export function StoreSwitcher() {
  const { isMobile } = useSidebar();
  const dispatch = useAppDispatch();
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const activeStore = stores.find((s) => s.id === activeStoreId) ?? stores[0];

  if (!activeStore) {
    return (
      <>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => setSheetOpen(true)}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Store className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">สร้างร้านค้า</span>
                <span className="truncate text-xs">ยังไม่มีร้านค้า</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <CreateStoreSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </>
    );
  }

  const ActiveIcon =
    activeStore.icon && storeIconMap[activeStore.icon]
      ? storeIconMap[activeStore.icon]
      : Store;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <ActiveIcon className="h-4 w-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeStore.name}
                  </span>
                  <span className="truncate text-xs">
                    {activeStore.jobTitle ?? "พนักงาน"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <ActiveIcon className="h-4 w-4" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span>{activeStore.name}</span>
                    <span className="text-xs">
                      {activeStore.jobTitle ?? "พนักงาน"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stores.map((s) => {
                const StoreIcon =
                  s.icon && storeIconMap[s.icon] ? storeIconMap[s.icon] : Store;
                return (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => {
                      dispatch(setActiveStore(s.id));
                      setOpen(false);
                    }}
                    className="gap-2 p-2"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border">
                      <StoreIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <span>{s.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {s.jobTitle ?? "พนักงาน"}
                      </span>
                    </div>
                    {s.id === activeStoreId && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2 p-2">
                <Link href="/stores">
                  <Store className="h-3.5 w-3.5" />
                  <span>จัดการร้านค้า</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSheetOpen(true);
                  setOpen(false);
                }}
                className="gap-2 p-2"
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-md">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span>สร้างร้านค้าใหม่</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <CreateStoreSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
