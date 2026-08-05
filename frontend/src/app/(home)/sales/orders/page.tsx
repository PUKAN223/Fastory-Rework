"use client";

import {
  AlertCircle,
  Banknote,
  Calendar,
  Coins,
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Printer,
  ReceiptText,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
import { DataTablePagination } from "@/components/tables/DataTablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchOrders, type Order, voidOrder } from "@/features/salesSlice";
import type { Store } from "@/features/storeSlice";
import { handlePrintReceipt } from "@/lib/printReceipt";
import { hasStorePermission } from "@/lib/permissions";
import { useAppDispatch, useAppSelector } from "@/store/hook";

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const { orders, fetchOrdersStatus } = useAppSelector((state) => state.sales);
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId),
    [stores, activeStoreId],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [orderToView, setOrderToView] = useState<Order | null>(null);

  useEffect(() => {
    if (fetchOrdersStatus === "idle") {
      dispatch(fetchOrders());
    }
  }, [dispatch, fetchOrdersStatus]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.status.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || o.paymentMethod === paymentFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const orderDate = new Date(o.createdAt);
      const today = new Date();
      if (dateFilter === "today") {
        matchesDate = orderDate.toDateString() === today.toDateString();
      } else if (dateFilter === "7days") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = orderDate >= sevenDaysAgo;
      } else if (dateFilter === "30days") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = orderDate >= thirtyDaysAgo;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const headers = [
      "เลขที่ออเดอร์",
      "วันที่",
      "เวลา",
      "พนักงานขาย",
      "วิธีชำระเงิน",
      "สถานะ",
      "รหัสสินค้า (SKU)",
      "ชื่อสินค้า",
      "จำนวน",
      "ราคา/ชิ้น",
      "ราคารวม"
    ];
    const rows: (string | number)[][] = [];

    filteredOrders.forEach((o) => {
      const date = new Date(o.createdAt);
      const dateStr = date.toLocaleDateString("th-TH");
      const timeStr = date.toLocaleTimeString("th-TH");
      const creatorStr = o.creator?.username || "Unknown";
      const paymentStr = o.paymentMethod === "cash" ? "เงินสด" : "PromptPay";
      const statusStr = o.status === "completed" ? "สำเร็จ" : o.status === "pending" ? "รอชำระเงิน" : "ยกเลิกแล้ว";

      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          rows.push([
            o.orderNumber,
            dateStr,
            timeStr,
            creatorStr,
            paymentStr,
            statusStr,
            item.productSku || "-",
            item.productName || "-",
            item.quantity || 0,
            item.unitPrice || 0,
            item.totalPrice || 0
          ]);
        });
      } else {
        rows.push([
          o.orderNumber,
          dateStr,
          timeStr,
          creatorStr,
          paymentStr,
          statusStr,
          "-",
          "-",
          0,
          0,
          o.total || 0
        ]);
      }
    });
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(item => `"${String(item).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("ดาวน์โหลดไฟล์ CSV สำเร็จ");
  };

  const {
    pageSize,
    totalPages,
    safeCurrentPage,
    setCurrentPage,
    setPageSize,
    paginate,
  } = usePagination({
    totalItems: filteredOrders.length,
    defaultPageSize: 10,
  });

  const paginatedOrders = useMemo(
    () => paginate(filteredOrders),
    [filteredOrders, paginate],
  );

  const handleVoidOrder = async () => {
    if (!orderToVoid) return;
    try {
      await dispatch(voidOrder(orderToVoid.id)).unwrap();
      toast.success(`ยกเลิกออเดอร์ ${orderToVoid.orderNumber} สำเร็จ`);
      setOrderToVoid(null);
    } catch (e: any) {
      toast.error(e || "ไม่สามารถยกเลิกออเดอร์ได้");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeaderCards
        title="ประวัติการขาย"
        description="รายการคำสั่งซื้อทั้งหมดของร้านค้า"
      >
        <Badge variant="secondary">{orders.length} รายการ</Badge>
      </PageHeaderCards>

      <EntityListCard
        title="รายการออเดอร์"
        description="ค้นหาและดูรายละเอียดรายการออเดอร์ทั้งหมด"
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
          <div className="w-full sm:w-[220px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ค้นหา</label>
            <Input
              placeholder="ค้นหาเลขที่ออเดอร์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="w-full sm:w-[150px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">สถานะ</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="completed">สำเร็จ</SelectItem>
                <SelectItem value="pending">รอชำระเงิน</SelectItem>
                <SelectItem value="voided">ยกเลิกแล้ว</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[150px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ช่องทางชำระเงิน</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="ทุกช่องทาง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกช่องทาง</SelectItem>
                <SelectItem value="cash">เงินสด</SelectItem>
                <SelectItem value="promptpay">PromptPay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[160px] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">วันที่</label>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="ทุกช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกช่วงเวลา</SelectItem>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="7days">7 วันที่ผ่านมา</SelectItem>
                <SelectItem value="30days">30 วันที่ผ่านมา</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-auto ml-auto">
            <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">เลขที่ออเดอร์</TableHead>
                <TableHead className="hidden md:table-cell whitespace-nowrap">วันที่-เวลา</TableHead>
                <TableHead className="hidden lg:table-cell whitespace-nowrap">พนักงานขาย</TableHead>
                <TableHead className="hidden sm:table-cell whitespace-nowrap">วิธีชำระเงิน</TableHead>
                <TableHead className="text-right whitespace-nowrap">ยอดรวม (บาท)</TableHead>
                <TableHead className="whitespace-nowrap">สถานะ</TableHead>
                <TableHead className="text-right whitespace-nowrap w-12">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    ไม่พบรายการออเดอร์
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className={
                      order.status === "voided" ? "bg-muted/30 opacity-70" : ""
                    }
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell className="hidden md:table-cell whitespace-nowrap">
                      <div className="flex items-center text-muted-foreground text-sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        {new Date(order.createdAt).toLocaleString("th-TH")}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell whitespace-nowrap">
                      {order.creator?.username || "Unknown"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell whitespace-nowrap">
                      {order.paymentMethod === "cash" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        >
                          เงินสด
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                        >
                          PromptPay
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ฿{Number(order.total).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {order.status === "completed" ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600">
                          สำเร็จ
                        </Badge>
                      ) : order.status === "pending" ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          รอชำระเงิน
                        </Badge>
                      ) : (
                        <Badge variant="destructive">ยกเลิกแล้ว</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right w-12">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setOrderToView(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            ดูรายละเอียด
                          </DropdownMenuItem>
                          {(order.status === "completed" ||
                            order.status === "pending") && hasStorePermission(activeStore?.permissions, "sales:void") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setOrderToVoid(order)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                ยกเลิกรายการ
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <DataTablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredOrders.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </EntityListCard>

      {/* View Details & Print Receipt Dialog */}
      <Dialog
        open={!!orderToView}
        onOpenChange={(open) => !open && setOrderToView(null)}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20 pr-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2 font-bold">
                  <ReceiptText className="size-5 text-primary" />
                  ออเดอร์ #{orderToView?.orderNumber}
                </DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2 text-xs">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {orderToView &&
                    new Date(orderToView.createdAt).toLocaleString("th-TH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                </DialogDescription>
              </div>

              {orderToView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10 shadow-xs shrink-0"
                  onClick={() => handlePrintReceipt(orderToView, activeStore)}
                >
                  <Printer className="size-4" />
                  พิมพ์ / ดาวน์โหลดใบเสร็จ
                </Button>
              )}
            </div>
          </DialogHeader>

          {orderToView && (
            <DialogPanel className="p-6 space-y-5 mt-5">
              {/* Order Info Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Salesperson Card */}
                <div className="p-3 bg-card rounded-xl border shadow-xs space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <User className="size-3.5 text-muted-foreground" />{" "}
                    พนักงานขาย
                  </p>
                  <p className="font-semibold text-sm text-foreground truncate">
                    {orderToView.creator?.username || "Admin"}
                  </p>
                </div>

                {/* Payment Method Card */}
                <div className="p-3 bg-card rounded-xl border shadow-xs space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Banknote className="size-3.5 text-muted-foreground" />{" "}
                    วิธีชำระเงิน
                  </p>
                  <div>
                    {orderToView.paymentMethod === "cash" ? (
                      <Badge
                        variant="secondary"
                        className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium"
                      >
                        เงินสด (Cash)
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs font-medium"
                      >
                        PromptPay
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Order Status Card */}
                <div className="p-3 bg-card rounded-xl border shadow-xs space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    สถานะออเดอร์
                  </p>
                  <div>
                    {orderToView.status === "completed" ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium">
                        สำเร็จ
                      </Badge>
                    ) : orderToView.status === "pending" ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium">
                        รอชำระเงิน (Pending)
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="text-xs font-medium"
                      >
                        ยกเลิกแล้ว (Voided)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Void Warning Alert if voided */}
              {orderToView.status === "voided" && (
                <div className="p-3.5 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-xs flex gap-3 items-start">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">
                      ออเดอร์นี้ถูกยกเลิก (Voided)
                    </p>
                    <p className="text-xs mt-0.5 opacity-90">
                      ยกเลิกโดย:{" "}
                      <span className="font-medium">
                        {orderToView.voider?.username || "System"}
                      </span>{" "}
                      เมื่อ{" "}
                      {orderToView.voidedAt
                        ? new Date(orderToView.voidedAt).toLocaleString("th-TH")
                        : "-"}
                    </p>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    รายการสินค้า ({orderToView.items?.length || 0})
                  </h4>
                </div>
                <div className="rounded-xl border overflow-x-auto bg-card shadow-xs">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold whitespace-nowrap">สินค้า</TableHead>
                        <TableHead className="font-semibold whitespace-nowrap">SKU</TableHead>
                        <TableHead className="text-center font-semibold whitespace-nowrap">
                          จำนวน
                        </TableHead>
                        <TableHead className="text-right font-semibold whitespace-nowrap">
                          ราคา/ชิ้น
                        </TableHead>
                        <TableHead className="text-right font-semibold whitespace-nowrap">
                          รวม
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderToView.items?.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-foreground whitespace-nowrap">
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                            {item.productSku || "-"}
                          </TableCell>
                          <TableCell className="text-center font-semibold whitespace-nowrap">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            ฿{Number(item.unitPrice).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            ฿{Number(item.totalPrice).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Breakdown Grid: Payment Details / Notes on Left, Summary Box on Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Left Side: Cash Info & Notes */}
                <div className="space-y-3">
                  {/* Cash Payment Details Card */}
                  {orderToView.paymentMethod === "cash" && (
                    <div className="p-3.5 bg-muted/20 rounded-xl border space-y-2 text-xs">
                      <p className="font-medium text-muted-foreground flex items-center gap-1.5">
                        <Coins className="size-3.5 text-emerald-500" />{" "}
                        ข้อมูลชำระเงินสด
                      </p>
                      <div className="space-y-1.5 pt-1">
                        {orderToView.amountReceived !== undefined && (
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>รับเงินสดมา</span>
                            <span className="font-semibold text-foreground">
                              ฿
                              {Number(
                                orderToView.amountReceived,
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {(orderToView.changeAmount !== undefined ||
                          orderToView.amountReceived) && (
                          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/40">
                            <span>เงินทอน</span>
                            <span className="text-sm">
                              ฿
                              {Number(
                                orderToView.changeAmount ??
                                  Number(orderToView.amountReceived || 0) -
                                    Number(orderToView.total),
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Note */}
                  {orderToView.note && (
                    <div className="p-3.5 bg-muted/20 rounded-xl border text-xs space-y-1">
                      <p className="font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5" /> หมายเหตุ:
                      </p>
                      <p className="text-foreground italic pl-5">
                        {orderToView.note}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side: Totals Card */}
                <div className="p-4 bg-muted/30 rounded-xl border space-y-2.5 text-xs shadow-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>ยอดรวมสินค้า</span>
                    <span className="font-medium text-foreground">
                      ฿
                      {Number(
                        orderToView.subtotal || orderToView.total,
                      ).toLocaleString()}
                    </span>
                  </div>
                  {Number(orderToView.discount) > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>ส่วนลด</span>
                      <span>
                        -฿{Number(orderToView.discount).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2.5 border-t border-border">
                    <span className="font-bold text-sm text-foreground">
                      ยอดชำระสุทธิ
                    </span>
                    <span className="text-xl font-extrabold text-primary">
                      ฿{Number(orderToView.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {(orderToView.status === "pending" ||
                    orderToView.status === "completed") && hasStorePermission(activeStore?.permissions, "sales:void") && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        const target = orderToView;
                        setOrderToView(null);
                        setOrderToVoid(target);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      ยกเลิกรายการ
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderToView(null)}
                >
                  ปิด
                </Button>
              </div>
            </DialogPanel>
          )}
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog
        open={!!orderToVoid}
        onOpenChange={(open) => !open && setOrderToVoid(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ยืนยันการยกเลิกออเดอร์
            </DialogTitle>
            <DialogDescription>
              คุณกำลังจะยกเลิกรายการออเดอร์ <b>{orderToVoid?.orderNumber}</b>
              <br />
              <br />
              การกระทำนี้จะคืนสต็อกสินค้าทั้งหมดกลับเข้าระบบ แต่จะไม่ลบข้อมูลออเดอร์ออกจากประวัติ
              คุณแน่ใจหรือไม่ว่าต้องการดำเนินการต่อ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOrderToVoid(null)}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleVoidOrder}>
              ยืนยันการยกเลิกออเดอร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
