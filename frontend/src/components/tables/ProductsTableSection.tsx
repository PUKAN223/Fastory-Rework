import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  Grid2X2,
  Search,
  Shapes,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductFormDrawer } from "@/components/forms/ProductFormDrawer";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatImageSrc } from "@/lib/formatImageSrc";
import { formatCurrency } from "@/lib/utils";
import type { CreateProductPayload, Product } from "@/types/products";

type ProductCategoryOption = { id: string; name: string };
type ProductStatusFilter = "all" | "active" | "inactive";
type ProductSortOption = "latest" | "price-desc" | "price-asc";
type ProductViewMode = "table" | "grid";
const PRODUCT_SKELETON_KEYS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
] as const;

type ProductsTableSectionProps = {
  products: Product[];
  categories: ProductCategoryOption[];
  imageUrlById: Record<string, string>;
  search: string;
  isLoading: boolean;
  isImagesLoading: boolean;
  onSearchChange: (value: string) => void;
  onUpdateProduct: (
    id: string,
    data: Partial<CreateProductPayload>,
  ) => Promise<boolean> | boolean;
  onDeleteProduct: (id: string) => Promise<boolean> | boolean;
};



function formatUpdatedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatProfit(costPrice: number, sellingPrice: number) {
  return sellingPrice - costPrice;
}

export function ProductsTableSection({
  products,
  categories,
  imageUrlById,
  search,
  isLoading,
  isImagesLoading,
  onSearchChange,
  onUpdateProduct,
  onDeleteProduct,
}: ProductsTableSectionProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<ProductSortOption>("latest");
  const [viewMode, setViewMode] = useState<ProductViewMode>("table");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [isBulkUpdatingCategory, setIsBulkUpdatingCategory] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const categoryNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.id] = c.name;
    return m;
  }, [categories]);

  const editInitialValues = useMemo(() => {
    if (!editingProduct) return null;
    const imgId = editingProduct.imageId;
    return {
      sku: editingProduct.sku,
      name: editingProduct.name,
      categoryId: editingProduct.categoryId,
      description: editingProduct.description,
      costPrice: editingProduct.costPrice,
      sellingPrice: editingProduct.sellingPrice,
      reorderPoint: editingProduct.reorderPoint ?? 0,
      isActive: editingProduct.isActive,
      imageId: imgId,
      imageUrl: imgId ? (imageUrlById[imgId] ?? null) : null,
    };
  }, [editingProduct, imageUrlById]);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? product.isActive : !product.isActive);
      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;
      return matchesStatus && matchesCategory;
    });

    filtered.sort((a, b) => {
      if (sortBy === "price-desc") {
        return b.sellingPrice - a.sellingPrice;
      }
      if (sortBy === "price-asc") {
        return a.sellingPrice - b.sellingPrice;
      }
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      const aValue = Number.isNaN(aTime) ? 0 : aTime;
      const bValue = Number.isNaN(bTime) ? 0 : bTime;
      return bValue - aValue;
    });

    return filtered;
  }, [products, statusFilter, categoryFilter, sortBy]);

  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    setCurrentPage,
    setPageSize,
    paginate,
  } = usePagination({
    totalItems: visibleProducts.length,
    defaultPageSize: 10,
  });

  const paginatedProducts = useMemo(
    () => paginate(visibleProducts),
    [visibleProducts, paginate],
  );

  const openEdit = useCallback((p: Product) => {
    setEditingProduct(p);
    setEditOpen(true);
  }, []);

  const openEditById = useCallback(
    (id: string) => {
      const product = products.find((item) => item.id === id);
      if (!product) return;
      openEdit(product);
    },
    [openEdit, products],
  );

  const closeEdit = useCallback((open: boolean) => {
    setEditOpen(open);
    if (!open) setEditingProduct(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (payload: CreateProductPayload) => {
      if (!editingProduct) return false;
      setIsSavingEdit(true);
      const ok = await onUpdateProduct(editingProduct.id, payload);
      setIsSavingEdit(false);
      if (ok) {
        setEditOpen(false);
        setEditingProduct(null);
      }
      return ok;
    },
    [editingProduct, onUpdateProduct],
  );

  const openDelete = useCallback((p: Product) => {
    setDeletingProduct(p);
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback((open: boolean) => {
    setDeleteOpen(open);
    if (!open) setDeletingProduct(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingProduct) return;

    setDeletingProductId(deletingProduct.id);
    const ok = await onDeleteProduct(deletingProduct.id);
    setDeletingProductId(null);

    if (ok) {
      setDeleteOpen(false);
      setDeletingProduct(null);
    }
  }, [deletingProduct, onDeleteProduct]);

  const hasAnyProduct = products.length > 0;
  const hasVisibleProducts = visibleProducts.length > 0;
  const selectedVisibleCount = useMemo(
    () =>
      visibleProducts.filter((product) =>
        selectedProductIds.includes(product.id),
      ).length,
    [visibleProducts, selectedProductIds],
  );
  const isAllVisibleSelected =
    visibleProducts.length > 0 &&
    selectedVisibleCount === visibleProducts.length;
  const hasPartialVisibleSelection =
    selectedVisibleCount > 0 && selectedVisibleCount < visibleProducts.length;

  useEffect(() => {
    const availableIdSet = new Set(products.map((product) => product.id));
    setSelectedProductIds((previous) =>
      previous.filter((id) => availableIdSet.has(id)),
    );
  }, [products]);

  const toggleProductSelection = useCallback((id: string, checked: boolean) => {
    setSelectedProductIds((previous) => {
      if (checked) {
        if (previous.includes(id)) return previous;
        return [...previous, id];
      }
      return previous.filter((productId) => productId !== id);
    });
  }, []);

  const toggleVisibleSelection = useCallback(
    (checked: boolean) => {
      const visibleIds = visibleProducts.map((product) => product.id);
      if (checked) {
        setSelectedProductIds((previous) => {
          const merged = new Set(previous);
          for (const id of visibleIds) merged.add(id);
          return Array.from(merged);
        });
        return;
      }

      const visibleSet = new Set(visibleIds);
      setSelectedProductIds((previous) =>
        previous.filter((id) => !visibleSet.has(id)),
      );
    },
    [visibleProducts],
  );

  const handleBulkCategoryUpdate = useCallback(async () => {
    if (!bulkCategoryId || selectedProductIds.length === 0) return;

    setIsBulkUpdatingCategory(true);
    const selectedSet = new Set(selectedProductIds);
    const targetProducts = products.filter((product) =>
      selectedSet.has(product.id),
    );
    const updatedIds: string[] = [];

    for (const product of targetProducts) {
      const ok = await onUpdateProduct(product.id, {
        categoryId: bulkCategoryId,
      });
      if (ok) updatedIds.push(product.id);
    }

    const updatedSet = new Set(updatedIds);
    setSelectedProductIds((previous) =>
      previous.filter((id) => !updatedSet.has(id)),
    );
    setBulkCategoryId("");
    setIsBulkUpdatingCategory(false);
  }, [bulkCategoryId, onUpdateProduct, products, selectedProductIds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedProductIds.length === 0) return;

    setIsBulkDeleting(true);
    const selectedSet = new Set(selectedProductIds);
    const targetProducts = products.filter((product) =>
      selectedSet.has(product.id),
    );
    const deletedIds: string[] = [];

    for (const product of targetProducts) {
      const ok = await onDeleteProduct(product.id);
      if (ok) deletedIds.push(product.id);
    }

    const deletedSet = new Set(deletedIds);
    setSelectedProductIds((previous) =>
      previous.filter((id) => !deletedSet.has(id)),
    );
    setIsBulkDeleting(false);
    setBulkDeleteOpen(false);
  }, [onDeleteProduct, products, selectedProductIds]);

  return (
    <>
      <div className="max-w-full space-y-4 overflow-x-hidden">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-64">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              placeholder="ค้นหาสินค้าด้วยชื่อหรือ SKU..."
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ProductStatusFilter)
            }
          >
            <SelectTrigger className="w-full sm:w-42.5">
              <SelectValue placeholder="สถานะ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">สถานะทั้งหมด</SelectItem>
              <SelectItem value="active">เปิดใช้งาน</SelectItem>
              <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-47.5">
              <SelectValue placeholder="หมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(value) => setSortBy(value as ProductSortOption)}
          >
            <SelectTrigger className="w-full sm:w-42.5">
              <SelectValue placeholder="เรียงลำดับ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">ล่าสุด</SelectItem>
              <SelectItem value="price-desc">ราคาสูงสุด</SelectItem>
              <SelectItem value="price-asc">ราคาต่ำสุด</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            variant="outline"
            className="justify-start"
            value={viewMode}
            onValueChange={(value) => {
              if (value) setViewMode(value as ProductViewMode);
            }}
          >
            <ToggleGroupItem value="grid">
              <Grid2X2></Grid2X2>
            </ToggleGroupItem>
            <ToggleGroupItem value="table">
              <Table2></Table2>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {isLoading && viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table className="[&_th:first-child]:text-center [&_td:first-child]:text-center [&_tr]:border-border/40">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={false}
                      disabled
                      aria-label="เลือกสินค้าทั้งหมด"
                    />
                  </TableHead>
                  <TableHead className="text-center">รูปภาพ</TableHead>
                  <TableHead className="whitespace-nowrap">SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-center">หมวดหมู่</TableHead>
                  <TableHead className="text-right">ต้นทุน</TableHead>
                  <TableHead className="text-right">ราคาขาย</TableHead>
                  <TableHead className="text-right">กำไร</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">สต็อก</TableHead>
                  <TableHead className="whitespace-nowrap">อัปเดตล่าสุด</TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    การกระทำ
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRODUCT_SKELETON_KEYS.map((key) => (
                  <TableRow key={`product-skeleton-${key}`}>
                    <TableCell>
                      <Skeleton className="mx-auto size-4 rounded-sm" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto size-10 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto h-6 w-24 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-20" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto h-6 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto size-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isLoading && viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_SKELETON_KEYS.map((key) => (
              <div
                key={`product-grid-skeleton-${key}`}
                className="rounded-lg border p-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="size-14 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasVisibleProducts ? (
          <div className="rounded-lg border bg-muted/15">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shapes />
                </EmptyMedia>
                <EmptyTitle>
                  {hasAnyProduct ? "ไม่พบสินค้าที่ตรงเงื่อนไข" : "ไม่พบสินค้า"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasAnyProduct
                    ? "ลองเปลี่ยนตัวกรอง หรือคำค้นหา แล้วค้นหาใหม่อีกครั้ง"
                    : "ลองเปลี่ยนคำค้นหา หรือตรวจสอบข้อมูลสินค้าอีกครั้ง"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <Table className="[&_th:first-child]:text-center [&_td:first-child]:text-center [&_tr]:border-border/40 [&_tbody_tr:hover]:bg-muted/25">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={
                        isAllVisibleSelected
                          ? true
                          : hasPartialVisibleSelection
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        toggleVisibleSelection(Boolean(checked))
                      }
                      aria-label="เลือกสินค้าทั้งหมดที่แสดง"
                    />
                  </TableHead>
                  <TableHead className="text-center">รูปภาพ</TableHead>
                  <TableHead className="whitespace-nowrap">SKU</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead className="text-center">หมวดหมู่</TableHead>
                  <TableHead className="text-right">ต้นทุน</TableHead>
                  <TableHead className="text-right">ราคาขาย</TableHead>
                  <TableHead className="text-right">กำไร</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead className="text-right">สต็อก</TableHead>
                  <TableHead className="whitespace-nowrap">อัปเดตล่าสุด</TableHead>
                  <TableHead className="text-center whitespace-nowrap">
                    การกระทำ
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedProducts.map((p) => {
                  const rawImgUrl = p.imageId
                    ? imageUrlById[p.imageId]
                    : undefined;
                  const imgUrl = rawImgUrl
                    ? formatImageSrc(rawImgUrl)
                    : undefined;
                  const catName =
                    categoryNameById[p.categoryId] ?? `#${p.categoryId}`;
                  const isDeleting = deletingProductId === p.id;
                  const profit = formatProfit(p.costPrice, p.sellingPrice);

                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => openEditById(p.id)}
                    >
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selectedProductIds.includes(p.id)}
                          onCheckedChange={(checked) =>
                            toggleProductSelection(p.id, Boolean(checked))
                          }
                          aria-label={`เลือกสินค้า ${p.name}`}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell>
                        {imgUrl ? (
                          <Image
                            alt={p.name}
                            className="mx-auto size-10 rounded-md object-cover ring-1 ring-border"
                            height={40}
                            width={40}
                            src={imgUrl}
                            unoptimized
                          />
                        ) : p.imageId && isImagesLoading ? (
                          <Skeleton className="mx-auto size-10 rounded-md" />
                        ) : (
                          <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                            No Img
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="font-medium">
                        {p.sku || "-"}
                      </TableCell>
                      <TableCell className="max-w-70 truncate">
                        {p.name}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="outline">{catName}</Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {formatCurrency(p.costPrice)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(p.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {formatCurrency(profit)}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={p.isActive ? "secondary" : "outline"}>
                            {p.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </Badge>
                          {p.stockOnHand <= p.reorderPoint &&
                            p.reorderPoint > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                สต็อกต่ำ
                              </Badge>
                            )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span
                          className={
                            p.stockOnHand <= p.reorderPoint &&
                            p.reorderPoint > 0
                              ? "text-destructive font-semibold"
                              : ""
                          }
                        >
                          {p.stockOnHand}
                        </span>
                        {p.stockOnHand <= p.reorderPoint &&
                          p.reorderPoint > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              / {p.reorderPoint}
                            </span>
                          )}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {formatUpdatedAt(p.updatedAt)}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              disabled={isDeleting}
                              size="icon"
                              variant="ghost"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Ellipsis className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <DropdownMenuItem onSelect={() => openEdit(p)}>
                              แก้ไข
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => openDelete(p)}
                              variant="destructive"
                            >
                              {isDeleting ? "กำลังลบ..." : "ลบ"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProducts.map((p) => {
              const rawImgUrl = p.imageId ? imageUrlById[p.imageId] : undefined;
              const imgUrl = rawImgUrl ? formatImageSrc(rawImgUrl) : undefined;
              const catName =
                categoryNameById[p.categoryId] ?? `#${p.categoryId}`;
              const profit = formatProfit(p.costPrice, p.sellingPrice);

              return (
                <div
                  key={p.id}
                  className="space-y-3 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center justify-end">
                    <Checkbox
                      checked={selectedProductIds.includes(p.id)}
                      onCheckedChange={(checked) =>
                        toggleProductSelection(p.id, Boolean(checked))
                      }
                      aria-label={`เลือกสินค้า ${p.name}`}
                    />
                  </div>

                  <button
                    type="button"
                    className="w-full space-y-3 text-left"
                    onClick={() => openEditById(p.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        {imgUrl ? (
                          <Image
                            alt={p.name}
                            className="size-14 rounded-md object-cover ring-1 ring-border"
                            height={56}
                            width={56}
                            src={imgUrl}
                            unoptimized
                          />
                        ) : p.imageId && isImagesLoading ? (
                          <Skeleton className="size-14 rounded-md" />
                        ) : (
                          <div className="flex size-14 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
                            No Img
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          SKU: {p.sku || "-"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline">{catName}</Badge>
                          <Badge variant={p.isActive ? "secondary" : "outline"}>
                            {p.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </Badge>
                          {p.stockOnHand <= p.reorderPoint &&
                            p.reorderPoint > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                สต็อกต่ำ
                              </Badge>
                            )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        กดเพื่อแก้ไข
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ต้นทุน</span>
                        <span>{formatCurrency(p.costPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ราคาขาย</span>
                        <span className="font-semibold">
                          {formatCurrency(p.sellingPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">กำไร</span>
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(profit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">สต็อก</span>
                        <span>
                          <span
                            className={
                              p.stockOnHand <= p.reorderPoint &&
                              p.reorderPoint > 0
                                ? "text-destructive font-semibold"
                                : ""
                            }
                          >
                            {p.stockOnHand}
                          </span>
                          {p.stockOnHand <= p.reorderPoint &&
                            p.reorderPoint > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                / {p.reorderPoint}
                              </span>
                            )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">อัปเดตล่าสุด</span>
                        <span className="text-right text-xs">
                          {formatUpdatedAt(p.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {hasVisibleProducts && (
          <DataTablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={visibleProducts.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>

      {selectedProductIds.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-10 z-40 flex justify-center px-3">
          <div className="pointer-events-auto animate-in fade-in-0 flex w-full max-w-[calc(100dvw-1rem)] flex-wrap items-center justify-center gap-2 overflow-x-auto rounded-xl border border-border/60 bg-background/95 p-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/85 sm:max-w-xl">
            <span className="mr-1 text-xs text-muted-foreground">
              เลือกแล้ว {selectedProductIds.length} รายการ
            </span>
            <Select
              value={bulkCategoryId}
              onValueChange={setBulkCategoryId}
              disabled={isBulkUpdatingCategory || isBulkDeleting}
            >
              <SelectTrigger className="h-8 w-44 sm:w-55">
                <SelectValue placeholder="เปลี่ยนหมวดหมู่เป็น..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={
                !bulkCategoryId || isBulkUpdatingCategory || isBulkDeleting
              }
              className="h-8 shadow-none"
              onClick={handleBulkCategoryUpdate}
            >
              {isBulkUpdatingCategory ? "กำลังอัปเดต..." : "เปลี่ยนหมวดหมู่"}
            </Button>
            <Button
              variant="destructive"
              className="h-8"
              disabled={isBulkDeleting || isBulkUpdatingCategory}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-8"
              disabled={isBulkDeleting || isBulkUpdatingCategory}
              onClick={() => setSelectedProductIds([])}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {editingProduct && editInitialValues ? (
        <ProductFormDrawer
          mode="edit"
          open={editOpen}
          categories={categories}
          onOpenChange={closeEdit}
          onSubmit={handleEditSubmit}
          isSubmitting={isSavingEdit}
          initialValues={editInitialValues}
        />
      ) : null}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={closeDelete}
        title="ยืนยันการลบสินค้า"
        description={`คุณต้องการลบสินค้า "${deletingProduct?.name ?? "-"}" ใช่หรือไม่?`}
        onConfirm={handleConfirmDelete}
        isDeleting={!deletingProduct || deletingProductId === deletingProduct?.id}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="ยืนยันการลบหลายรายการ"
        description={`คุณต้องการลบสินค้าที่เลือก ${selectedProductIds.length} รายการใช่หรือไม่?`}
        onConfirm={handleBulkDelete}
        isDeleting={selectedProductIds.length === 0 || isBulkDeleting}
      />
    </>
  );
}
