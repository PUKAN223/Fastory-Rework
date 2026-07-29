"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Containers } from "@/components/Containers";
import { CategoryStatsCards } from "@/components/card/CategoryStatsCards";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { CreateCategoryDrawer } from "@/components/drawers/CreateCategoryDrawer";
import { CategoriesTableSection } from "@/components/tables/CategoriesTableSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchCategories } from "@/features/categoriesSlice";
import { useEntityCrudHandlers } from "@/hooks/useEntityCrudHandlers";
import { notifyErrorOnce } from "@/lib/notifyError";
import {
  createCategoryService,
  deleteCategoryService,
  updateCategoryService,
} from "@/services/inventory/category.service";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { CreateCategoryPayload } from "@/types/categories";

export default function InventoryCategoriesPage() {
  const dispatch = useAppDispatch();
  const {
    items: categories,
    fetchStatus,
    createStatus,
    error,
  } = useAppSelector((s) => s.categories);

  const [search, setSearch] = useState("");
  const lastErrorRef = useRef<string | null>(null);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredCategories = useMemo(() => {
    if (!normalizedSearch) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(normalizedSearch),
    );
  }, [categories, normalizedSearch]);

  const totalProducts = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.productCount, 0);
  }, [categories]);

  const latestCategoryName = useMemo(
    () => categories[0]?.name ?? "-",
    [categories],
  );

  const weeklyTrend = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWeekStart = now - oneWeekMs;
    const previousWeekStart = now - oneWeekMs * 2;

    const currentWeekCategories = categories.filter((category) => {
      const createdAt = new Date(category.createdAt).getTime();
      return createdAt >= currentWeekStart;
    });

    const previousWeekCategories = categories.filter((category) => {
      const createdAt = new Date(category.createdAt).getTime();
      return createdAt >= previousWeekStart && createdAt < currentWeekStart;
    });

    const currentWeekCount = currentWeekCategories.length;
    const previousWeekCount = previousWeekCategories.length;
    const currentWeekProducts = currentWeekCategories.reduce(
      (sum, category) => sum + category.productCount,
      0,
    );
    const previousWeekProducts = previousWeekCategories.reduce(
      (sum, category) => sum + category.productCount,
      0,
    );

    return {
      categoriesDelta: currentWeekCount - previousWeekCount,
      productsDelta: currentWeekProducts - previousWeekProducts,
    };
  }, [categories]);

  useEffect(() => {
    if (fetchStatus === "idle") dispatch(fetchCategories());
  }, [dispatch, fetchStatus]);

  useEffect(() => {
    notifyErrorOnce(error, lastErrorRef);
  }, [error]);

  const createCategoryAction = useCallback(
    async (payload: CreateCategoryPayload) => {
      await createCategoryService(dispatch, payload);
    },
    [dispatch],
  );

  const updateCategoryAction = useCallback(
    async (id: string, payload: Partial<CreateCategoryPayload>) => {
      await updateCategoryService(dispatch, id, payload);
    },
    [dispatch],
  );

  const deleteCategoryAction = useCallback(
    async (id: string) => {
      await deleteCategoryService(dispatch, id);
    },
    [dispatch],
  );

  const {
    handleCreate: handleCreateCategory,
    handleUpdate: handleUpdateCategory,
    handleDelete: handleDeleteCategory,
  } = useEntityCrudHandlers<
    CreateCategoryPayload,
    Partial<CreateCategoryPayload>
  >({
    createAction: createCategoryAction,
    updateAction: updateCategoryAction,
    deleteAction: deleteCategoryAction,
    messages: {
      updateSuccess: "อัปเดตหมวดหมู่สำเร็จ",
      deleteSuccess: "ลบหมวดหมู่สำเร็จ",
    },
  });

  return (
    <Containers>
      <PageHeaderCards
        title="หมวดหมู่สินค้า"
        description="สร้าง จัดการ และติดตามหมวดหมู่สินค้าของคุณได้อย่างง่ายดายในที่เดียว"
      >
        <Badge variant="secondary">{categories.length} หมวดหมู่</Badge>
        <Badge variant="outline">{totalProducts} สินค้า</Badge>
      </PageHeaderCards>

      <CategoryStatsCards
        categoriesCount={categories.length}
        latestCategoryName={latestCategoryName}
        totalProducts={totalProducts}
        categoriesDelta={weeklyTrend.categoriesDelta}
        productsDelta={weeklyTrend.productsDelta}
      />

      <EntityListCard
        title="รายการหมวดหมู่"
        description="เพิ่ม ค้นหา และดูรายละเอียดของหมวดหมู่สินค้าได้ที่นี่"
        actions={
          <>
            <CreateCategoryDrawer
              isSubmitting={createStatus === "loading"}
              onCreate={handleCreateCategory}
            />
            <Button asChild variant="outline">
              <Link href="/inventory/products">จัดการสินค้า</Link>
            </Button>
          </>
        }
      >
        <CategoriesTableSection
          categories={filteredCategories}
          search={search}
          onSearchChange={setSearch}
          onDeleteCategory={handleDeleteCategory}
          onUpdateCategory={handleUpdateCategory}
        />
      </EntityListCard>
    </Containers>
  );
}
