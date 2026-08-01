"use client";

import { AlertTriangle, Barcode, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Containers } from "@/components/Containers";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { ProductStatsCards } from "@/components/card/ProductStatsCards";
import { ProductsCharts } from "@/components/charts/ProductsCharts";
import { BulkScannerModal } from "@/components/forms/BulkScannerModal";
import { ProductFormDrawer } from "@/components/forms/ProductFormDrawer";
import { ProductsTableSection } from "@/components/tables/ProductsTableSection";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCategories, isCategoriesStale } from "@/features/categoriesSlice";
import { fetchImages } from "@/features/imageSlice";
import { fetchLocations, isLocationsStale } from "@/features/locationsSlice";
import { fetchProducts, isProductsStale } from "@/features/productsSlice";
import { useEntityCrudHandlers } from "@/hooks/useEntityCrudHandlers";
import { notifyErrorOnce } from "@/lib/notifyError";
import {
  createProductService,
  deleteProductService,
  updateProductService,
} from "@/services/inventory/product.service";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { CreateProductPayload } from "@/types/products";

export default function InventoryProductsPage() {
  const dispatch = useAppDispatch();
  const {
    items: products,
    fetchStatus,
    createStatus,
    error,
  } = useAppSelector((state) => state.products);
  const { items: categories, fetchStatus: categoriesFetchStatus } =
    useAppSelector((state) => state.categories);
  const { items: locations, fetchStatus: locationsFetchStatus } =
    useAppSelector((state) => state.locations);
  const { items: images, fetchStatus: imagesFetchStatus } = useAppSelector(
    (state) => state.images,
  );

  const [search, setSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const lastErrorRef = useRef<string | null>(null);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.sku.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, normalizedSearch]);

  const activeProductsCount = useMemo(
    () => products.filter((product) => product.isActive).length,
    [products],
  );

  const totalProductsValue = useMemo(() => {
    const total = products.reduce(
      (sum, product) => sum + product.sellingPrice,
      0,
    );
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
  }, [products]);

  const latestProductName = useMemo(() => {
    if (products.length === 0) {
      return "-";
    }

    return products.reduce((latest, current) => {
      const latestDate = new Date(latest.createdAt).getTime();
      const currentDate = new Date(current.createdAt).getTime();
      return currentDate > latestDate ? current : latest;
    }).name;
  }, [products]);

  const lowStockCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product.stockOnHand <= product.reorderPoint &&
          product.reorderPoint > 0,
      ).length,
    [products],
  );

  const weeklyTrend = useMemo(() => {
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWeekStart = now - oneWeekMs;
    const previousWeekStart = now - oneWeekMs * 2;

    const currentWeekProducts = products.filter((product) => {
      const createdAt = new Date(product.createdAt).getTime();
      return createdAt >= currentWeekStart;
    });

    const previousWeekProducts = products.filter((product) => {
      const createdAt = new Date(product.createdAt).getTime();
      return createdAt >= previousWeekStart && createdAt < currentWeekStart;
    });

    const currentWeekCount = currentWeekProducts.length;
    const previousWeekCount = previousWeekProducts.length;
    const currentWeekActive = currentWeekProducts.filter(
      (product) => product.isActive,
    ).length;
    const previousWeekActive = previousWeekProducts.filter(
      (product) => product.isActive,
    ).length;
    const currentWeekValue = currentWeekProducts.reduce(
      (sum, product) => sum + product.sellingPrice,
      0,
    );
    const previousWeekValue = previousWeekProducts.reduce(
      (sum, product) => sum + product.sellingPrice,
      0,
    );

    return {
      countDelta: currentWeekCount - previousWeekCount,
      activeDelta: currentWeekActive - previousWeekActive,
      valueDelta: Math.round(currentWeekValue - previousWeekValue),
    };
  }, [products]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({ id: category.id, name: category.name })),
    [categories],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((location) => ({ id: location.id, name: location.name })),
    [locations],
  );

  const imageUrlById = useMemo(
    () =>
      images.reduce<Record<string, string>>((acc, image) => {
        acc[image.id] = image.url;
        return acc;
      }, {}),
    [images],
  );

  const productsLastFetched = useAppSelector(
    (state) => state.products.lastFetched,
  );
  const categoriesLastFetched = useAppSelector(
    (state) => state.categories.lastFetched,
  );
  const locationsLastFetched = useAppSelector(
    (state) => state.locations.lastFetched,
  );

  useEffect(() => {
    if (fetchStatus === "idle" || isProductsStale(productsLastFetched)) {
      dispatch(fetchProducts());
    }
  }, [dispatch, fetchStatus, productsLastFetched]);

  useEffect(() => {
    if (
      categoriesFetchStatus === "idle" ||
      isCategoriesStale(categoriesLastFetched)
    ) {
      dispatch(fetchCategories());
    }
  }, [categoriesFetchStatus, dispatch, categoriesLastFetched]);

  useEffect(() => {
    if (fetchStatus === "succeeded" && imagesFetchStatus === "idle") {
      dispatch(fetchImages());
    }
  }, [dispatch, fetchStatus, imagesFetchStatus]);

  useEffect(() => {
    if (
      locationsFetchStatus === "idle" ||
      isLocationsStale(locationsLastFetched)
    ) {
      dispatch(fetchLocations());
    }
  }, [dispatch, locationsFetchStatus, locationsLastFetched]);

  useEffect(() => {
    notifyErrorOnce(error, lastErrorRef);
  }, [error]);

  const createProductAction = async (payload: CreateProductPayload) => {
    await createProductService(dispatch, payload);
  };

  const updateProductAction = async (
    id: string,
    payload: Partial<CreateProductPayload>,
  ) => {
    await updateProductService(dispatch, id, payload);
  };

  const deleteProductAction = async (id: string) => {
    await deleteProductService(dispatch, id);
  };

  const {
    handleCreate: handleCreateProduct,
    handleUpdate: handleUpdateProduct,
    handleDelete: handleDeleteProduct,
  } = useEntityCrudHandlers<
    CreateProductPayload,
    Partial<CreateProductPayload>
  >({
    createAction: createProductAction,
    updateAction: updateProductAction,
    deleteAction: deleteProductAction,
    messages: {
      createSuccess: "เพิ่มสินค้าสำเร็จ",
      updateSuccess: "แก้ไขข้อมูลสินค้าสำเร็จ",
      deleteSuccess: "ลบสินค้าสำเร็จ",
    },
  });

  const verifyAndOpen = (action: "scanner" | "drawer") => {
    const hasCategories = categories.length > 0;
    const hasLocations = locations.length > 0;

    if (!hasCategories || !hasLocations) {
      const missing: string[] = [];
      if (!hasCategories) missing.push("หมวดหมู่สินค้า");
      if (!hasLocations) missing.push("คลังสินค้า");
      toast.error(`ไม่สามารถเพิ่มสินค้าได้: กรุณาสร้าง${missing.join(" และ")}ก่อนเริ่มต้น`);
      return;
    }

    if (action === "scanner") {
      setScannerOpen(true);
    } else {
      setCreateDrawerOpen(true);
    }
  };

  return (
    <Containers>
      <div className="space-y-4 overflow-x-hidden">
        <PageHeaderCards
          title="สินค้า"
          description="จัดการข้อมูลสินค้า เพิ่ม ลบ หรือแก้ไขรายละเอียดต่างæ ของสินค้าได้ที่นี่"
        >
          <Badge variant="outline">สินค้าทั้งหมด {products.length} รายการ</Badge>
        </PageHeaderCards>

        <Tabs defaultValue="products">
          <TabsList className="mb-2">
            <TabsTrigger value="products">สินค้า</TabsTrigger>
            <TabsTrigger value="stats">สถิติสินค้า</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {(categories.length === 0 || locations.length === 0) && (
              <Alert variant="warning" className="animate-fade-in">
                <AlertTriangle className="size-4 text-warning" />
                <AlertTitle className="text-sm font-semibold text-warning-foreground">
                  ตรวจพบข้อมูลระบบไม่ครบถ้วน
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-3 mt-1.5">
                  <span>
                    คุณต้องสร้าง{" "}
                    {categories.length === 0 && (
                      <strong className="text-foreground">หมวดหมู่สินค้า</strong>
                    )}
                    {categories.length === 0 &&
                      locations.length === 0 &&
                      " และ "}
                    {locations.length === 0 && (
                      <strong className="text-foreground">คลังสินค้า</strong>
                    )}{" "}
                    ก่อนเพื่อเริ่มระบบการจัดการสแกนและสแกนสต็อกสินค้า
                  </span>
                  <AlertAction className="flex gap-2 shrink-0 sm:ml-auto">
                    {categories.length === 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-7 text-[10px]"
                        asChild
                      >
                        <Link href="/inventory/categories">สร้างหมวดหมู่</Link>
                      </Button>
                    )}
                    {locations.length === 0 && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-7 text-[10px]"
                        asChild
                      >
                        <Link href="/inventory/warehouses">สร้างคลังสินค้า</Link>
                      </Button>
                    )}
                  </AlertAction>
                </AlertDescription>
              </Alert>
            )}

            <EntityListCard
              title="รายการสินค้า"
              description="เพิ่ม ค้นหา แก้ไข และลบข้อมูลสินค้าได้ที่นี่"
              contentClassName="overflow-x-hidden"
              actions={
                <div className="flex">
                  {/* Primary: open scanner */}
                  <Button
                    size="sm"
                    className="rounded-r-none border-r-0 gap-1.5 px-3"
                    onClick={() => verifyAndOpen("scanner")}
                  >
                    <Barcode className="size-3.5" />
                    สแกน / เพิ่มสินค้า
                  </Button>
                  {/* Dropdown arrow */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        className="rounded-l-none px-2 border-l border-primary-foreground/20"
                        aria-label="ตัวเลือกเพิ่มเติม"
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => verifyAndOpen("scanner")}
                      >
                        <Barcode className="size-4" />
                        สแกน Barcode / SKU
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => verifyAndOpen("drawer")}>
                        <Plus className="size-4" />
                        เพิ่มสินค้าด้วยตนเอง
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
            >
              <ProductsTableSection
                products={filteredProducts}
                categories={categoryOptions}
                locations={locationOptions}
                imageUrlById={imageUrlById}
                isImagesLoading={
                  imagesFetchStatus === "idle" ||
                  imagesFetchStatus === "loading"
                }
                search={search}
                isLoading={fetchStatus === "loading"}
                onSearchChange={setSearch}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
              />
            </EntityListCard>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <ProductStatsCards
              productsCount={products.length}
              activeProductsCount={activeProductsCount}
              totalProductsValue={totalProductsValue}
              latestProductName={latestProductName}
              lowStockCount={lowStockCount}
              productsDelta={weeklyTrend.countDelta}
              activeDelta={weeklyTrend.activeDelta}
              valueDelta={weeklyTrend.valueDelta}
            />

            <ProductsCharts products={products} />
          </TabsContent>
        </Tabs>
      </div>
      <BulkScannerModal open={scannerOpen} onOpenChange={setScannerOpen} />
      <ProductFormDrawer
        mode="create"
        open={createDrawerOpen}
        categories={categoryOptions}
        locations={locationOptions}
        onOpenChange={setCreateDrawerOpen}
        onSubmit={handleCreateProduct}
        isSubmitting={createStatus === "loading"}
      />
    </Containers>
  );
}
