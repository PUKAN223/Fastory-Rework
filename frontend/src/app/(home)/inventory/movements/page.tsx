"use client";

import {
  AlertTriangle,
  History,
  MinusCircle,
  Plus,
  PlusCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Containers } from "@/components/Containers";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { MovementCharts } from "@/components/charts/MovementCharts";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { fetchProducts } from "@/features/productsSlice";
import { createMovement, fetchMovements } from "@/features/stockMovementsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hook";

import { fetchLocations } from "@/features/locationsSlice";

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

const SKELETON_KEYS = ["1", "2", "3", "4", "5"];

export default function StockMovementsPage() {
  const dispatch = useAppDispatch();
  const {
    items: movements,
    fetchStatus,
    createStatus,
  } = useAppSelector((state) => state.stockMovements);
  const { items: products, fetchStatus: productsFetchStatus } = useAppSelector(
    (state) => state.products,
  );
  const { items: locations, fetchStatus: locationsFetchStatus } =
    useAppSelector((state) => state.locations);

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [deltaType, setDeltaType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (fetchStatus === "idle") {
      dispatch(fetchMovements());
    }
  }, [dispatch, fetchStatus]);

  useEffect(() => {
    if (productsFetchStatus === "idle") {
      dispatch(fetchProducts());
    }
  }, [dispatch, productsFetchStatus]);

  useEffect(() => {
    if (locationsFetchStatus === "idle") {
      dispatch(fetchLocations());
    }
  }, [dispatch, locationsFetchStatus]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(selectedProductId)),
    [products, selectedProductId],
  );

  const selectedLocationInfo = useMemo(() => {
    if (!selectedProduct || !selectedProduct.locationId) return null;
    const loc = locations.find(
      (l) => String(l.id) === String(selectedProduct.locationId),
    );
    if (!loc) return null;

    const usedStock = products
      .filter((p) => String(p.locationId) === String(loc.id))
      .reduce((sum, p) => sum + (p.stockOnHand || 0), 0);

    const remainingCap = Math.max(0, loc.maxCapacity - usedStock);
    const isFull = usedStock >= loc.maxCapacity;

    return {
      locationName: loc.name,
      maxCapacity: loc.maxCapacity,
      usedStock,
      remainingCap,
      isFull,
    };
  }, [selectedProduct, locations, products]);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return movements;
    return movements.filter(
      (m) =>
        m.productName.toLowerCase().includes(query) ||
        m.productSku.toLowerCase().includes(query) ||
        m.reason.toLowerCase().includes(query),
    );
  }, [movements, search]);

  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    setCurrentPage,
    setPageSize,
    paginate,
  } = usePagination({
    totalItems: filteredMovements.length,
    defaultPageSize: 10,
  });

  const paginatedMovements = useMemo(
    () => paginate(filteredMovements),
    [filteredMovements, paginate],
  );

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !amount || !reason.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("จำนวนสินค้าต้องมากกว่า 0");
      return;
    }

    if (
      deltaType === "in" &&
      selectedLocationInfo &&
      numericAmount > selectedLocationInfo.remainingCap
    ) {
      toast.error(
        `ไม่สามารถรับสินค้าเข้าคลังได้: จำนวนที่ใส่ (${numericAmount} ชิ้น) เกินขีดความจุที่เหลือของ "${selectedLocationInfo.locationName}" (เหลือรองรับได้อีก ${selectedLocationInfo.remainingCap} ชิ้น)`,
        { duration: 5000 },
      );
      return;
    }

    const delta = deltaType === "in" ? numericAmount : -numericAmount;

    try {
      await dispatch(
        createMovement({
          productId: selectedProductId,
          delta,
          reason: reason.trim(),
          note: note.trim() || undefined,
        }),
      ).unwrap();

      toast.success("ปรับสต็อกสำเร็จ");
      setDrawerOpen(false);

      // Reset form
      setSelectedProductId("");
      setAmount("");
      setReason("");
      setNote("");

      // Reload products to update the main products list stockOnHand count
      dispatch(fetchProducts());
    } catch (err: any) {
      const errorMsg =
        typeof err === "string" ? err : err?.message || "ปรับสต็อกไม่สำเร็จ";
      toast.error(errorMsg, { duration: 6000 });
    }
  };

  const isSubmitting = createStatus === "loading";

  const totalIn = useMemo(
    () => movements.reduce((s, m) => (m.delta > 0 ? s + m.delta : s), 0),
    [movements],
  );
  const totalOut = useMemo(
    () =>
      movements.reduce((s, m) => (m.delta < 0 ? s + Math.abs(m.delta) : s), 0),
    [movements],
  );

  return (
    <Containers>
      <PageHeaderCards
        title="ประวัติสต็อก"
        description="ตรวจสอบรายการรับเข้า-จ่ายออก และประวัติการเปลี่ยนแปลงสต็อกสินค้าทั้งหมดภายในร้านค้า"
      >
        <Badge variant="outline">การเคลื่อนไหว {movements.length} รายการ</Badge>
      </PageHeaderCards>

      <Tabs defaultValue="history">
        <TabsList className="mb-2">
          <TabsTrigger value="history">ประวัติสต็อก</TabsTrigger>
          <TabsTrigger value="stats">สถิติการเคลื่อนไหว</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <EntityListCard
            title="รายการเปลี่ยนแปลงสต็อก"
            description="ดูรายการความเคลื่อนไหวสต็อกสินค้าล่าสุด"
            actions={
              <Drawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                direction="right"
              >
                <DrawerTrigger asChild>
                  <Button className="px-5 shadow-xs">
                    <Plus className="mr-2 size-4" />
                    ปรับสต็อกด่วน
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="flex h-full sm:max-w-md">
                  <DrawerHeader>
                    <DrawerTitle>ปรับสต็อกด่วน</DrawerTitle>
                    <DrawerDescription>
                      บันทึกประวัติการปรับเพิ่มหรือลดสต็อกสินค้าด้วยตนเอง
                    </DrawerDescription>
                  </DrawerHeader>

                  <form
                    onSubmit={handleAdjustStock}
                    className="flex-1 space-y-4 overflow-y-auto px-4 pb-4"
                  >
                    <div className="space-y-2">
                      <Label>สินค้า</Label>
                      <Select
                        value={selectedProductId}
                        onValueChange={setSelectedProductId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกสินค้าที่ต้องการปรับสต็อก" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku || "-"}) - คลัง:{" "}
                              {p.stockOnHand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedLocationInfo && (
                        <div
                          className={`mt-2 rounded-lg border p-2.5 text-xs flex items-start gap-2 ${
                            selectedLocationInfo.isFull
                              ? "border-red-500/40 bg-red-500/10 text-red-400"
                              : selectedLocationInfo.remainingCap <= 10
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                : "border-border/60 bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground">
                              📍 {selectedLocationInfo.locationName}
                            </p>
                            <p className="mt-0.5">
                              ความจุคลัง:{" "}
                              <span className="font-bold text-foreground">
                                {selectedLocationInfo.usedStock} /{" "}
                                {selectedLocationInfo.maxCapacity} ชิ้น
                              </span>
                              {selectedLocationInfo.isFull ? (
                                <span className="ml-1 font-bold text-red-400">
                                  (คลังเต็มแล้ว ⚠️)
                                </span>
                              ) : (
                                <span className="ml-1 text-emerald-400">
                                  (เหลือใส่ได้อีก{" "}
                                  {selectedLocationInfo.remainingCap} ชิ้น)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>ประเภทการปรับสต็อก</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={deltaType === "in" ? "default" : "outline"}
                          onClick={() => setDeltaType("in")}
                          className="w-full"
                        >
                          <PlusCircle className="mr-2 size-4 text-emerald-500" />
                          รับเข้า (+)
                        </Button>
                        <Button
                          type="button"
                          variant={deltaType === "out" ? "default" : "outline"}
                          onClick={() => setDeltaType("out")}
                          className="w-full"
                        >
                          <MinusCircle className="mr-2 size-4 text-rose-500" />
                          จ่ายออก (-)
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adjust-amount">จำนวนสินค้า</Label>
                      <Input
                        id="adjust-amount"
                        type="number"
                        min={1}
                        placeholder="ใส่จำนวนสินค้า"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adjust-reason">เหตุผล</Label>
                      <Input
                        id="adjust-reason"
                        placeholder="เช่น เติมสินค้าหน้าร้าน, สินค้าชำรุด"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adjust-note">บันทึกข้อความเพิ่มเติม</Label>
                      <Textarea
                        id="adjust-note"
                        placeholder="ข้อความหมายเหตุเพิ่มเติม (ไม่จำเป็น)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>

                    <DrawerFooter className="pt-4">
                      <DrawerClose asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSubmitting}
                        >
                          ยกเลิก
                        </Button>
                      </DrawerClose>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                      </Button>
                    </DrawerFooter>
                  </form>
                </DrawerContent>
              </Drawer>
            }
          >
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="ค้นหาตามสินค้า, SKU, หรือเหตุผล..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {fetchStatus === "loading" ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันเวลา</TableHead>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">
                          การเปลี่ยนแปลง
                        </TableHead>
                        <TableHead>เหตุผล</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                        <TableHead>ผู้บันทึก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SKELETON_KEYS.map((key) => (
                        <TableRow key={key}>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="ml-auto h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-28" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="rounded-lg border bg-muted/15">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <History />
                      </EmptyMedia>
                      <EmptyTitle>ไม่พบข้อมูลการเคลื่อนไหวสต็อก</EmptyTitle>
                      <EmptyDescription>
                        ยังไม่มีการปรับเปลี่ยนยอดสต็อก หรือลองเปลี่ยนคำค้นหาใหม่อีกครั้ง
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>วันเวลา</TableHead>
                        <TableHead>สินค้า</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">
                          การเปลี่ยนแปลง
                        </TableHead>
                        <TableHead>เหตุผล</TableHead>
                        <TableHead>หมายเหตุ</TableHead>
                        <TableHead>ผู้บันทึก</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMovements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatUpdatedAt(m.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {m.productName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {m.productSku}
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
                          <TableCell>{m.reason}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {m.note || "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {m.createdBy || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {filteredMovements.length > 0 && (
                    <DataTablePagination
                      currentPage={safeCurrentPage}
                      totalPages={totalPages}
                      pageSize={pageSize}
                      totalItems={filteredMovements.length}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                    />
                  )}
                </div>
              )}
            </div>
          </EntityListCard>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-border/60 py-3 shadow-none">
              <CardContent className="space-y-1 px-4">
                <p className="text-xs text-muted-foreground">
                  การเคลื่อนไหวทั้งหมด
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {movements.length}
                </p>
                <p className="text-xs text-muted-foreground">รายการ</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 py-3 shadow-none">
              <CardContent className="space-y-1 px-4">
                <p className="text-xs text-muted-foreground">รับเข้าทั้งหมด</p>
                <p className="text-3xl font-semibold tracking-tight text-emerald-600">
                  +{totalIn}
                </p>
                <p className="text-xs text-muted-foreground">สต็อกยูนิต</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 py-3 shadow-none">
              <CardContent className="space-y-1 px-4">
                <p className="text-xs text-muted-foreground">จ่ายออกทั้งหมด</p>
                <p className="text-3xl font-semibold tracking-tight text-rose-600">
                  -{totalOut}
                </p>
                <p className="text-xs text-muted-foreground">สต็อกยูนิต</p>
              </CardContent>
            </Card>
          </div>

          <MovementCharts movements={movements} />
        </TabsContent>
      </Tabs>
    </Containers>
  );
}
