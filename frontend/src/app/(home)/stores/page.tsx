"use client";

import { CheckCircle2, MoreHorizontal, Pencil, Plus, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateStoreSheet, EditStoreSheet } from "@/components/AddStoreDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchStores,
  type Store as StoreType,
  setActiveStore,
} from "@/features/storeSlice";
import { hasStorePermission } from "@/lib/permissions";
import { storeIconMap } from "@/lib/storeIcons";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

export default function StoresPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const loading = useAppSelector((state) => state.stores.loading);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);

  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  const handleSelectStore = (id: number) => {
    dispatch(setActiveStore(id));
    const targetStore = stores.find((s) => s.id === id);
    const perms = targetStore?.permissions;

    if (
      hasStorePermission(perms, "sales:write") &&
      !hasStorePermission(perms, "reports:read")
    ) {
      router.push("/sales/pos");
    } else {
      router.push("/dashboard");
    }
  };

  /* ──────────── Loading skeleton ──────────── */
  if (loading && stores.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-6 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center"
              >
                <Skeleton className="mb-4 size-16 rounded-2xl" />
                <Skeleton className="mb-2 h-5 w-32" />
                <Skeleton className="mb-4 h-4 w-48" />
                <Skeleton className="mb-4 h-10 w-full" />
                <div className="w-full border-t border-border/50 my-4" />
                <div className="flex w-full justify-around">
                  <Skeleton className="h-8 w-12" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ──────────── Empty state ──────────── */
  if (stores.length === 0) {
    return (
      <>
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
            <Store className="size-8" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            ยังไม่มีร้านค้า
          </h1>
          <p className="mb-8 max-w-xs text-sm text-muted-foreground">
            สร้างร้านค้าแรกของคุณเพื่อเริ่มจัดการสต็อกและสินค้าด้วย Fastory
          </p>
          <Button
            onClick={() => setSheetOpen(true)}
            size="lg"
            className="gap-2 rounded-xl"
          >
            <Plus className="size-4" />
            สร้างร้านค้าแรก
          </Button>
        </div>
        <CreateStoreSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </>
    );
  }

  /* ──────────── Store list (centered grid) ──────────── */
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 w-full max-w-2xl text-center">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-muted-foreground/80">
          <Store className="size-3.5" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            ร้านค้าของฉัน
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          เลือกร้านที่ต้องการใช้งาน
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          คุณมี {stores.length} ร้านค้า · เลือกแผงควบคุมร้านค้าของคุณ
        </p>
      </div>

      {/* Store cards grid */}
      <div
        className={cn(
          "grid gap-4 w-full justify-center",
          stores.length === 1
            ? "max-w-xs grid-cols-1"
            : "max-w-2xl grid-cols-1 sm:grid-cols-2",
        )}
      >
        {stores.map((s) => {
          const isActive = s.id === activeStoreId;
          const StoreIcon =
            s.icon && storeIconMap[s.icon] ? storeIconMap[s.icon] : Store;

          return (
            <div
              key={s.id}
              className={cn(
                "group relative flex flex-col items-center rounded-2xl border bg-card p-6 text-center",
                "transition-all duration-150 ease-out",
                isActive
                  ? "border-primary bg-primary/[0.01] shadow-sm"
                  : "border-border/60 hover:border-border hover:bg-muted/[0.15]",
              )}
            >
              {/* Dropdown Menu (Absolute Top Right) */}
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150"
                      aria-label="ตัวเลือก"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStore(s);
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                      แก้ไขข้อมูลร้านค้า
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Store icon */}
              <button
                type="button"
                onClick={() => handleSelectStore(s.id)}
                className={cn(
                  "mb-4 flex size-16 items-center justify-center rounded-2xl border transition-all duration-150",
                  isActive
                    ? "border-primary/20 bg-primary/5 text-primary"
                    : "border-border/50 bg-muted/40 text-muted-foreground group-hover:border-border/80 group-hover:bg-muted/80 group-hover:text-foreground",
                )}
                aria-label={`เลือกร้าน ${s.name}`}
                tabIndex={-1}
              >
                <StoreIcon className="size-8" />
              </button>

              {/* Info clickable */}
              <button
                type="button"
                onClick={() => handleSelectStore(s.id)}
                className="flex w-full flex-col items-center gap-1 focus-visible:outline-none"
              >
                <span className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-1">
                  {s.name}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <span>ID: #{s.id}</span>
                  <span className="opacity-40">•</span>
                  <Badge
                    variant="secondary"
                    className="h-4.5 rounded-full px-2 text-[10px] font-normal"
                  >
                    {s.jobTitle ?? "พนักงาน"}
                  </Badge>
                </div>

                {isActive && (
                  <Badge className="mt-1 h-4.5 gap-1 rounded-full bg-primary/10 px-2 text-[10px] font-medium text-primary border-0 hover:bg-primary/10">
                    <CheckCircle2 className="size-2.5" />
                    ใช้งานอยู่
                  </Badge>
                )}
                {!s.is_active && (
                  <Badge
                    variant="outline"
                    className="mt-1 h-4.5 rounded-full px-2 text-[10px] text-muted-foreground"
                  >
                    ปิดใช้งาน
                  </Badge>
                )}

                {s.description ? (
                  <p className="mt-3 line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed min-h-[2rem]">
                    {s.description}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground/40 italic leading-relaxed min-h-[2rem]">
                    ไม่มีคำอธิบายร้านค้า
                  </p>
                )}
              </button>

              {/* Divider */}
              <div className="my-4 w-full border-t border-border/50" />

              {/* Stats */}
              <div className="flex w-full items-center justify-around text-xs text-muted-foreground">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-foreground">
                    {s.productCount ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                    สินค้า
                  </span>
                </div>
                <div className="h-6 w-px bg-border/50" />
                <div className="flex flex-col items-center">
                  <span className="text-sm font-semibold text-foreground">
                    {s.memberCount ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                    พนักงาน
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add new store */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-transparent p-6 text-center transition-all duration-150 min-h-[260px]",
            "text-muted-foreground hover:border-border hover:bg-muted/[0.15] hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-dashed border-current bg-transparent transition-all duration-150">
            <Plus className="size-6" />
          </div>
          <span className="text-base font-semibold">เพิ่มร้านค้าใหม่</span>
          <span className="mt-1 text-xs opacity-70 max-w-[180px]">
            สร้างร้านค้าเพิ่มเติมเพื่อแยกการจัดการแบรนด์
          </span>
        </button>
      </div>

      {/* Dialogs & Sheets */}
      <CreateStoreSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <EditStoreSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        store={selectedStore}
      />
    </div>
  );
}
