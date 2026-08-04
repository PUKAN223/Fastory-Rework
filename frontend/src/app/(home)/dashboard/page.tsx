"use client";

import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  History,
  Layers,
  Package,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCategories } from "@/features/categoriesSlice";
import { fetchImages } from "@/features/imageSlice";
import { fetchLocations } from "@/features/locationsSlice";
import { fetchProducts } from "@/features/productsSlice";
import { fetchMovements } from "@/features/stockMovementsSlice";
import { formatImageSrc } from "@/lib/formatImageSrc";
import { useAppDispatch, useAppSelector } from "@/store/hook";

/* ── Custom Tooltip for recharts ── */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  const { items: products, fetchStatus: productsStatus } = useAppSelector(
    (state) => state.products,
  );
  const { items: categories, fetchStatus: categoriesStatus } = useAppSelector(
    (state) => state.categories,
  );
  const { items: locations, fetchStatus: locationsStatus } = useAppSelector(
    (state) => state.locations,
  );
  const { items: movements, fetchStatus: movementsStatus } = useAppSelector(
    (state) => state.stockMovements,
  );
  const { items: images, fetchStatus: imagesStatus } = useAppSelector(
    (state) => state.images,
  );
  const { stores, activeStoreId } = useAppSelector((state) => state.stores);

  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId),
    [stores, activeStoreId],
  );

  useEffect(() => {
    if (productsStatus === "idle") dispatch(fetchProducts());
    if (categoriesStatus === "idle") dispatch(fetchCategories());
    if (locationsStatus === "idle") dispatch(fetchLocations());
    if (movementsStatus === "idle") dispatch(fetchMovements());
    if (imagesStatus === "idle") dispatch(fetchImages());
  }, [
    dispatch,
    productsStatus,
    categoriesStatus,
    locationsStatus,
    movementsStatus,
    imagesStatus,
  ]);

  const imageUrlById = useMemo(
    () =>
      images.reduce<Record<string, string>>((acc, img) => {
        acc[img.id] = img.url;
        return acc;
      }, {}),
    [images],
  );

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (p) => p.stockOnHand <= p.reorderPoint && p.reorderPoint > 0,
      ),
    [products],
  );

  const totalProductsValue = useMemo(() => {
    const total = products.reduce(
      (sum, p) => sum + p.sellingPrice * p.stockOnHand,
      0,
    );
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(total);
  }, [products]);

  const totalCapacity = useMemo(
    () => locations.reduce((sum, l) => sum + l.maxCapacity, 0),
    [locations],
  );

  const recentMovements = useMemo(() => movements.slice(0, 5), [movements]);

  /* ── Build 7-day chart data ── */
  const chartData = useMemo(() => {
    const days: { date: Date; label: string; in: number; out: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        date: d,
        label: d.toLocaleDateString("th-TH", {
          weekday: "short",
          day: "numeric",
        }),
        in: 0,
        out: 0,
      });
    }

    for (const m of movements) {
      const mDate = new Date(m.createdAt);
      mDate.setHours(0, 0, 0, 0);
      const day = days.find((d) => d.date.getTime() === mDate.getTime());
      if (!day) continue;
      if (m.delta > 0) day.in += m.delta;
      else day.out += Math.abs(m.delta);
    }

    return days.map((d) => ({ name: d.label, สินค้าเข้า: d.in, สินค้าออก: d.out }));
  }, [movements]);

  const isLoading =
    productsStatus === "loading" ||
    categoriesStatus === "loading" ||
    locationsStatus === "loading" ||
    movementsStatus === "loading" ||
    imagesStatus === "loading";

  return (
    <div className="min-w-0 space-y-5 pb-6 overflow-x-clip">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">แดชบอร์ด</h1>
        <p className="text-muted-foreground text-sm">
          ยินดีต้อนรับสู่ร้านค้า {activeStore?.name || "–"} / ข้อมูลสรุปคลังสินค้า
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div className="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <Card className="border-border/60 py-3 shadow-none min-w-[180px] md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">สินค้าทั้งหมด</p>
              <Package className="size-4 text-muted-foreground shrink-0" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight">
                  {products.length} <span className="text-xs font-normal text-muted-foreground">รายการ</span>
                </p>
                <p className="text-xs text-muted-foreground truncate" title={totalProductsValue}>
                  มูลค่า {totalProductsValue}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[180px] md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <div className="flex items-center justify-between">
              <p className={`text-xs ${lowStockProducts.length > 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                สต็อกต่ำ
              </p>
              <AlertTriangle className={`size-4 shrink-0 ${lowStockProducts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className={`text-3xl font-semibold tracking-tight ${lowStockProducts.length > 0 ? "text-destructive" : ""}`}>
                  {lowStockProducts.length} <span className="text-xs font-normal opacity-70">รายการ</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {lowStockProducts.length > 0 ? "ต้องสั่งซื้อเพิ่ม" : "สต็อกปกติ"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[180px] md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">หมวดหมู่</p>
              <Layers className="size-4 text-muted-foreground shrink-0" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight">
                  {categories.length} <span className="text-xs font-normal text-muted-foreground">หมวด</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">จัดจำแนกกลุ่ม</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 py-3 shadow-none min-w-[180px] md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">คลังสินค้า</p>
              <Warehouse className="size-4 text-muted-foreground shrink-0" />
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight">
                  {locations.length} <span className="text-xs font-normal text-muted-foreground">แห่ง</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">ความจุรวม {totalCapacity}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart: Stock Movement Overview (last 7 days) */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="size-4 shrink-0" />
              <span className="truncate">ภาพรวมการเคลื่อนไหวสต็อก</span>
            </CardTitle>
            <CardDescription className="truncate text-xs sm:text-sm">
              สินค้าเข้า–ออกย้อนหลัง 7 วัน
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 h-8 px-2 sm:px-3" asChild>
            <Link href="/inventory/movements">
              <span className="hidden sm:inline">ดูทั้งหมด</span>
              <ArrowRight className="sm:ml-1 size-4 sm:size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 sm:pt-0 pt-0">
          {isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="min-w-[520px] sm:min-w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="oklch(0.92 0.004 286.32)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "oklch(0.552 0.016 285.938)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "oklch(0.552 0.016 285.938)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={28}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "oklch(0.967 0.001 286.375 / 0.6)" }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(value) => (
                        <span style={{ color: "oklch(0.552 0.016 285.938)" }}>
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="สินค้าเข้า"
                      fill="oklch(0.646 0.222 41.116)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="สินค้าออก"
                      fill="oklch(0.577 0.245 27.325)"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row: Low Stock + Recent Movements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Low Stock Alerts */}
        <Card className="border-border/60 shadow-none lg:col-span-3 md:col-span-1 min-w-0 overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-2">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-rose-600 dark:text-rose-500">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="truncate">สต็อกสินค้าวิกฤต</span>
              </CardTitle>
              <CardDescription className="truncate text-xs sm:text-sm">สินค้าที่ลดลงต่ำกว่าจุดสั่งซื้อซ้ำ</CardDescription>
            </div>
            {lowStockProducts.length > 5 && (
              <Button variant="ghost" size="sm" className="shrink-0 h-8 px-2 sm:px-3" asChild>
                <Link href="/inventory/products">
                  <span className="hidden sm:inline">ดูทั้งหมด</span>
                  <ArrowRight className="sm:ml-1 size-4 sm:size-3" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <Package className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  ไม่มีสินค้าชิ้นใดสต็อกต่ำ
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((p) => {
                  const rawImgUrl = p.imageId
                    ? imageUrlById[p.imageId]
                    : undefined;
                  const imgSrc = rawImgUrl
                    ? formatImageSrc(rawImgUrl)
                    : undefined;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Product Image Thumbnail */}
                        <div className="size-10 rounded-md border bg-muted/40 shrink-0 overflow-hidden flex items-center justify-center">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={p.name}
                              className="size-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <Package className="size-5 text-muted-foreground/40" />
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p
                            className="text-[13px] sm:text-sm font-medium truncate"
                            title={p.name}
                          >
                            {p.name.length > 35
                              ? `${p.name.slice(0, 35)}...`
                              : p.name}
                          </p>
                          <p className="text-muted-foreground text-[10px] sm:text-xs font-mono">
                            SKU: {p.sku || "–"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <Badge
                          variant="destructive"
                          className="h-5 sm:h-6 px-1.5 sm:px-2.5 font-semibold text-[10px] sm:text-xs"
                        >
                          {p.stockOnHand} / {p.reorderPoint}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          asChild
                        >
                          <Link href="/inventory/products">
                            <ExternalLink className="size-3.5 text-muted-foreground" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card className="border-border/60 shadow-none lg:col-span-4 md:col-span-1 min-w-0 overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 pb-2">
            <div className="space-y-1 min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <History className="size-4 shrink-0" />
                <span className="truncate">การเคลื่อนไหวสต็อกล่าสุด</span>
              </CardTitle>
              <CardDescription className="truncate text-xs sm:text-sm">
                ประวัติการปรับเพิ่มและปรับลดยอดสต็อก 5 รายการล่าสุด
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 h-8 px-2 sm:px-3" asChild>
              <Link href="/inventory/movements">
                <span className="hidden sm:inline">ดูทั้งหมด</span>
                <ArrowRight className="sm:ml-1 size-4 sm:size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2 pb-3 sm:p-6 sm:pt-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recentMovements.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center">
                <History className="size-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  ไม่มีประวัติการปรับสต็อก
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>สินค้า</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMovements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium max-w-[140px] truncate">
                          {m.productName}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              m.delta > 0
                                ? "font-semibold text-emerald-600 dark:text-emerald-500"
                                : "font-semibold text-rose-600 dark:text-rose-500"
                            }
                          >
                            {m.delta > 0 ? `+${m.delta}` : m.delta}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs">
                          {m.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
