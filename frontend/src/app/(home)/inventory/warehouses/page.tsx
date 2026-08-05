"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Containers } from "@/components/Containers";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { WarehouseStatsCards } from "@/components/card/WarehouseStatsCards";
import { WarehouseCharts } from "@/components/charts/WarehouseCharts";
import { CreateWarehouseModal } from "@/components/drawers/CreateWarehouseModal";
import { WarehousesTableSection } from "@/components/tables/WarehousesTableSection";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "@/components/ui/page-tabs";
import { Warehouse, BarChart3 } from "lucide-react";
import { fetchLocations } from "@/features/locationsSlice";
import { useEntityCrudHandlers } from "@/hooks/useEntityCrudHandlers";
import { notifyErrorOnce } from "@/lib/notifyError";
import {
  createWarehouseService,
  deleteWarehouseService,
  forceDeleteWarehouseService,
  updateWarehouseService,
} from "@/services/inventory/warehouse.service";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { CreateWarehousePayload } from "@/types/locations";

export default function InventoryWarehousesPage() {
  const dispatch = useAppDispatch();
  const {
    items: warehouses,
    fetchStatus,
    createStatus,
    error,
  } = useAppSelector((s) => s.locations);

  const [search, setSearch] = useState("");
  const lastErrorRef = useRef<string | null>(null);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredWarehouses = useMemo(() => {
    if (!normalizedSearch) return warehouses;
    return warehouses.filter((w) =>
      w.name.toLowerCase().includes(normalizedSearch),
    );
  }, [warehouses, normalizedSearch]);

  const totalCapacity = useMemo(() => {
    return warehouses.reduce((sum, w) => sum + w.maxCapacity, 0);
  }, [warehouses]);

  const latestWarehouseName = useMemo(
    () => warehouses[0]?.name ?? "-",
    [warehouses],
  );

  const weeklyTrend = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWeekStart = now - oneWeekMs;
    const previousWeekStart = now - oneWeekMs * 2;

    const currentWeekWarehouses = warehouses.filter((warehouse) => {
      const createdAt = new Date(warehouse.createdAt).getTime();
      return createdAt >= currentWeekStart;
    });

    const previousWeekWarehouses = warehouses.filter((warehouse) => {
      const createdAt = new Date(warehouse.createdAt).getTime();
      return createdAt >= previousWeekStart && createdAt < currentWeekStart;
    });

    const currentWeekCount = currentWeekWarehouses.length;
    const previousWeekCount = previousWeekWarehouses.length;
    const currentWeekCapacity = currentWeekWarehouses.reduce(
      (sum, warehouse) => sum + warehouse.maxCapacity,
      0,
    );
    const previousWeekCapacity = previousWeekWarehouses.reduce(
      (sum, warehouse) => sum + warehouse.maxCapacity,
      0,
    );

    return {
      warehousesDelta: currentWeekCount - previousWeekCount,
      capacityDelta: currentWeekCapacity - previousWeekCapacity,
    };
  }, [warehouses]);

  useEffect(() => {
    if (fetchStatus === "idle") dispatch(fetchLocations());
  }, [dispatch, fetchStatus]);

  useEffect(() => {
    notifyErrorOnce(error, lastErrorRef);
  }, [error]);

  const createWarehouseAction = useCallback(
    async (payload: CreateWarehousePayload) => {
      await createWarehouseService(dispatch, payload);
    },
    [dispatch],
  );

  const updateWarehouseAction = useCallback(
    async (id: string, payload: Partial<CreateWarehousePayload>) => {
      await updateWarehouseService(dispatch, id, payload);
    },
    [dispatch],
  );

  const deleteWarehouseAction = useCallback(
    async (id: string) => {
      await deleteWarehouseService(dispatch, id);
    },
    [dispatch],
  );

  const forceDeleteWarehouseAction = useCallback(
    async (id: string) => {
      await forceDeleteWarehouseService(dispatch, id);
    },
    [dispatch],
  );

  const {
    handleCreate: handleCreateWarehouse,
    handleUpdate: handleUpdateWarehouse,
    handleDelete: handleDeleteWarehouse,
  } = useEntityCrudHandlers<
    CreateWarehousePayload,
    Partial<CreateWarehousePayload>
  >({
    createAction: createWarehouseAction,
    updateAction: updateWarehouseAction,
    deleteAction: deleteWarehouseAction,
    messages: {
      createSuccess: "เพิ่มคลังสินค้าสำเร็จ",
      updateSuccess: "อัปเดตคลังสินค้าสำเร็จ",
      deleteSuccess: "ลบคลังสินค้าสำเร็จ",
    },
  });

  const { handleDelete: handleForceDeleteWarehouse } = useEntityCrudHandlers<
    CreateWarehousePayload,
    Partial<CreateWarehousePayload>
  >({
    createAction: createWarehouseAction,
    updateAction: updateWarehouseAction,
    deleteAction: forceDeleteWarehouseAction,
    messages: {
      deleteSuccess: "Force ลบคลังสินค้าสำเร็จ",
    },
  });

  return (
    <Containers>
      <PageHeaderCards
        title="คลังสินค้า"
        description="สร้าง จัดการ และติดตามคลังสินค้าของคุณได้อย่างง่ายดายในที่เดียว"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{warehouses.length} คลัง</Badge>
          <Badge variant="outline">ความจุรวม {totalCapacity}</Badge>
        </div>
      </PageHeaderCards>

      <PageTabs defaultValue="warehouses" className="w-full">
        <PageTabsList>
          <PageTabsTrigger value="warehouses" icon={Warehouse}>
            คลังสินค้า
          </PageTabsTrigger>
          <PageTabsTrigger value="stats" icon={BarChart3}>
            สถิติคลัง
          </PageTabsTrigger>
        </PageTabsList>

        <PageTabsContent value="warehouses" className="space-y-4">
          <EntityListCard
            title="รายการคลังสินค้า"
            description="เพิ่ม ค้นหา แก้ไข และลบข้อมูลคลังสินค้าได้ที่นี่"
            actions={
              <CreateWarehouseModal
                isSubmitting={createStatus === "loading"}
                onCreate={handleCreateWarehouse}
              />
            }
          >
            <WarehousesTableSection
              warehouses={filteredWarehouses}
              search={search}
              onSearchChange={setSearch}
              onDeleteWarehouse={handleDeleteWarehouse}
              onUpdateWarehouse={handleUpdateWarehouse}
              onForceDeleteWarehouse={handleForceDeleteWarehouse}
            />
          </EntityListCard>
        </PageTabsContent>

        <PageTabsContent value="stats" className="space-y-4">
          <WarehouseStatsCards
            latestWarehouseName={latestWarehouseName}
            totalCapacity={totalCapacity}
            warehousesCount={warehouses.length}
            warehousesDelta={weeklyTrend.warehousesDelta}
            capacityDelta={weeklyTrend.capacityDelta}
          />

          <WarehouseCharts warehouses={warehouses} />
        </PageTabsContent>
      </PageTabs>
    </Containers>
  );
}
