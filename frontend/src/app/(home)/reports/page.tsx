"use client";

import { format, isAfter, parseISO, subDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Download,
  Filter,
  HandCoins,
  LineChart as LineIcon,
  Percent,
  PieChart as PieIcon,
  Printer,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Containers } from "@/components/Containers";
import { EntityListCard } from "@/components/card/EntityListCard";
import { PageHeaderCards } from "@/components/card/PageHeaderCards";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchOrders, fetchSummary } from "@/features/salesSlice";
import { formatCurrency } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hook";

type DateRangeOption = "7d" | "30d" | "all";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const dateStr = label
    ? format(parseISO(label), "d MMMM yyyy", { locale: th })
    : "";

  return (
    <div className="rounded-xl border border-border/80 bg-zinc-900/95 p-3 text-xs shadow-xl backdrop-blur-md">
      {dateStr && (
        <p className="mb-1.5 font-semibold text-zinc-100">{dateStr}</p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-zinc-400 mt-0.5">
          <span
            className="size-2.5 rounded-full border border-white/20 shadow-sm"
            style={{ background: p.fill || p.color || p.stroke }}
          />
          <span>{p.name}:</span>
          <span className="font-semibold text-zinc-100">
            {typeof p.value === "number" &&
            (p.name.includes("ยอดขาย") || p.name.includes("มูลค่า"))
              ? formatCurrency(p.value)
              : p.name.includes("ออเดอร์") || p.name.includes("จำนวน")
                ? `${p.value} รายการ`
                : formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyChartContent({
  message = "ไม่มีข้อมูลเพียงพอสำหรับการแสดงกราฟ",
  onResetRange,
}: {
  message?: string;
  onResetRange?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground mb-3 shadow-inner">
        <BarChart3 className="size-5 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
        ทำรายการขายในระบบ หรือปรับเปลี่ยนการกรองช่วงเวลา
      </p>
      <div className="flex items-center gap-2 mt-3">
        {onResetRange && (
          <Button
            size="sm"
            variant="outline"
            onClick={onResetRange}
            className="h-7 text-xs px-2.5 border-border/60 hover:bg-muted/50"
          >
            <Filter className="size-3 mr-1 text-muted-foreground" /> ดูข้อมูลทั้งหมด
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          asChild
          className="h-7 text-xs px-2.5"
        >
          <Link href="/sales/pos">
            <ShoppingBag className="size-3 mr-1" /> เปิดบิลขาย (POS)
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const dispatch = useAppDispatch();
  const _summary = useAppSelector((state) => state.sales.dailySummary);
  const orders = useAppSelector((state) => state.sales.orders);
  const status = useAppSelector((state) => state.sales.fetchSummaryStatus);
  const stores = useAppSelector((state) => state.stores.stores);
  const activeStoreId = useAppSelector((state) => state.stores.activeStoreId);
  const activeStore = useMemo(
    () => stores.find((s) => s.id === activeStoreId),
    [stores, activeStoreId],
  );

  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");
  const [activeTab, setActiveTab] = useState<
    "overview" | "trends" | "products"
  >("overview");

  useEffect(() => {
    if (activeStoreId) {
      dispatch(fetchSummary());
      dispatch(fetchOrders());
    }
  }, [dispatch, activeStoreId]);

  // Filter completed orders based on date range
  const filteredOrders = useMemo(() => {
    const completed = orders.filter((o) => o.status === "completed");
    if (dateRange === "all") return completed;

    const now = new Date();
    const days = dateRange === "7d" ? 7 : 30;
    const cutoffDate = subDays(now, days);

    return completed.filter((o) => {
      const orderDate = new Date(o.createdAt);
      return isAfter(orderDate, cutoffDate);
    });
  }, [orders, dateRange]);

  // Dynamic Metrics derived from filtered orders
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let cashTotal = 0;
    let promptpayTotal = 0;
    let maxOrderValue = 0;

    const salesTrendMap = new Map<
      string,
      { date: string; revenue: number; orders: number }
    >();
    const productMap = new Map<
      number,
      {
        productId: number;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const order of filteredOrders) {
      const total = Number(order.total);
      totalRevenue += total;
      if (total > maxOrderValue) maxOrderValue = total;

      if (order.paymentMethod === "cash") cashTotal += total;
      else if (order.paymentMethod === "promptpay") promptpayTotal += total;

      // Group date trends
      const dateStr = format(new Date(order.createdAt), "yyyy-MM-dd");
      if (!salesTrendMap.has(dateStr)) {
        salesTrendMap.set(dateStr, { date: dateStr, revenue: 0, orders: 0 });
      }
      const dayData = salesTrendMap.get(dateStr)!;
      dayData.revenue += total;
      dayData.orders += 1;

      // Group top products
      for (const item of order.items || []) {
        const pId = item.productId;
        if (!productMap.has(pId)) {
          productMap.set(pId, {
            productId: pId,
            productName: item.productName,
            quantity: 0,
            revenue: 0,
          });
        }
        const prod = productMap.get(pId)!;
        prod.quantity += item.quantity;
        prod.revenue += Number(item.totalPrice);
      }
    }

    const totalOrders = filteredOrders.length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const salesTrends = Array.from(salesTrendMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const topProducts = Array.from(productMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    return {
      totalRevenue,
      totalOrders,
      cashTotal,
      promptpayTotal,
      aov,
      maxOrderValue,
      salesTrends,
      topProducts,
    };
  }, [filteredOrders]);

  const exportToCSV = () => {
    if (metrics.salesTrends.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }
    const headers = ["วันที่", "ยอดขาย (บาท)", "จำนวนออเดอร์"];
    const rows = metrics.salesTrends.map(t => [t.date, t.revenue.toString(), t.orders.toString()]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    window.print();
  };

  const paymentChartData = [
    { name: "เงินสด", value: metrics.cashTotal, color: "#a1a1aa" },
    { name: "พร้อมเพย์", value: metrics.promptpayTotal, color: "#64748b" },
  ].filter((d) => d.value > 0);

  if (status === "loading" || status === "idle") {
    return (
      <Containers>
        <PageHeaderCards
          title="รายงานและการวิเคราะห์ยอดขาย"
          description="กำลังโหลดข้อมูลรายงานและสถิติต่างๆ..."
        />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Containers>
    );
  }

  return (
    <Containers>
      {/* Page Header */}
      <PageHeaderCards
        title="รายงานและการวิเคราะห์ยอดขาย"
        description="ภาพรวมประสิทธิภาพทางการเงิน ยอดขายรายวัน ช่องทางการชำระเงิน และอันดับสินค้าขายดี"
      >
        <div className="flex items-center gap-2">
          {activeStore && (
            <Badge variant="secondary" className="px-3 py-1 font-medium">
              ร้าน: {activeStore.name}
            </Badge>
          )}
          <Badge variant="outline" className="px-3 py-1 hidden sm:flex">
            ช่วงเวลา:{" "}
            {dateRange === "7d"
              ? "7 วันล่าสุด"
              : dateRange === "30d"
                ? "30 วันล่าสุด"
                : "ทั้งหมด"}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportToCSV} className="h-7 text-xs px-2.5">
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button variant="default" size="sm" onClick={printPDF} className="h-7 text-xs px-2.5">
            <Printer className="w-3 h-3 mr-1" />
            พิมพ์
          </Button>
        </div>
      </PageHeaderCards>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/60 bg-card shadow-none">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium shrink-0">ตัวกรองช่วงเวลา:</span>
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar w-full">
            <Button
              size="sm"
              variant={dateRange === "7d" ? "default" : "outline"}
              onClick={() => setDateRange("7d")}
              className="text-xs h-8"
            >
              7 วันล่าสุด
            </Button>
            <Button
              size="sm"
              variant={dateRange === "30d" ? "default" : "outline"}
              onClick={() => setDateRange("30d")}
              className="text-xs h-8"
            >
              30 วันล่าสุด
            </Button>
            <Button
              size="sm"
              variant={dateRange === "all" ? "default" : "outline"}
              onClick={() => setDateRange("all")}
              className="text-xs h-8"
            >
              ทั้งหมด
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-full sm:w-auto"
          >
            <TabsList className="h-8 bg-muted/60 p-1 w-full justify-start overflow-x-auto hide-scrollbar">
              <TabsTrigger value="overview" className="text-xs px-3">
                ภาพรวม
              </TabsTrigger>
              <TabsTrigger value="trends" className="text-xs px-3">
                แนวโน้มรายวัน
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs px-3">
                สินค้าขายดี
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* KPI Stats Cards - Subtle Muted Dark Styling */}
      {/* KPI Stats Cards */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Card 1: Revenue */}
        <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">ยอดขายรวม</p>
            <div className="text-2xl 2xl:text-3xl font-semibold tracking-tight text-foreground truncate" title={formatCurrency(metrics.totalRevenue)}>
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">จากทั้งหมด {metrics.totalOrders} ออเดอร์</p>
          </CardContent>
        </Card>

        {/* Card 2: Orders */}
        <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">จำนวนคำสั่งซื้อ</p>
            <div className="text-2xl 2xl:text-3xl font-semibold tracking-tight text-foreground truncate" title={metrics.totalOrders.toString()}>
              {metrics.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">รายการที่เสร็จสมบูรณ์</p>
          </CardContent>
        </Card>

        {/* Card 3: AOV */}
        <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">ยอดสั่งซื้อเฉลี่ย (AOV)</p>
            <div className="text-2xl 2xl:text-3xl font-semibold tracking-tight text-foreground truncate" title={formatCurrency(metrics.aov)}>
              {formatCurrency(metrics.aov)}
            </div>
            <p className="text-xs text-muted-foreground">เฉลี่ยต่อคำสั่งซื้อ</p>
          </CardContent>
        </Card>

        {/* Card 4: Max Order Value */}
        <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">ยอดสั่งซื้อสูงสุดในบิลเดียว</p>
            <div className="text-2xl 2xl:text-3xl font-semibold tracking-tight text-foreground truncate" title={formatCurrency(metrics.maxOrderValue)}>
              {formatCurrency(metrics.maxOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">มูลค่าบิลสูงสุด</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Bar Chart */}
            <Card className="md:col-span-2 lg:col-span-4 border-border/60 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    แนวโน้มยอดขายตามวันที่
                  </CardTitle>
                  <CardDescription className="text-xs">
                    กราฟแท่งแสดงยอดขายรวมรายวันในช่วงเวลาที่เลือก
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[320px]">
                {metrics.salesTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.salesTrends}
                      margin={{ top: 10, right: 10, left: 0, bottom: 15 }}
                    >
                      <defs>
                        <linearGradient
                          id="revenueBarMuted"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#d4d4d8"
                            stopOpacity={0.85}
                          />
                          <stop
                            offset="100%"
                            stopColor="#71717a"
                            stopOpacity={0.5}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.1}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) =>
                          format(parseISO(val), "d MMM", { locale: th })
                        }
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground font-medium"
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        className="fill-muted-foreground"
                        tickFormatter={(val) =>
                          `฿${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                        }
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="revenue"
                        name="ยอดขาย"
                        fill="url(#revenueBarMuted)"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={26}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartContent
                    message="ไม่มีข้อมูลยอดขายในช่วงเวลาที่เลือก"
                    onResetRange={() => setDateRange("all")}
                  />
                )}
              </CardContent>
            </Card>

            {/* Payment Methods Donut Chart */}
            <Card className="md:col-span-2 lg:col-span-3 border-border/60 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <PieIcon className="w-4 h-4 text-muted-foreground" />
                  สัดส่วนช่องทางการชำระเงิน
                </CardTitle>
                <CardDescription className="text-xs">
                  เปรียบเทียบการชำระด้วยเงินสดและพร้อมเพย์
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {metrics.totalRevenue > 0 && paymentChartData.length > 0 ? (
                  <>
                    <div className="relative h-[240px] w-full">
                      {/* Center Stat Number */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                        <span className="text-xl font-bold tracking-tight text-foreground">
                          {formatCurrency(metrics.totalRevenue)}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          ยอดขายรวม
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={74}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {paymentChartData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={entry.color}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 pt-1">
                      {paymentChartData.map((entry) => {
                        const pct =
                          metrics.totalRevenue > 0
                            ? (
                                (entry.value / metrics.totalRevenue) *
                                100
                              ).toFixed(1)
                            : "0";
                        return (
                          <div
                            key={entry.name}
                            className="flex items-center gap-2 text-xs font-medium"
                          >
                            <div
                              className="size-2.5 rounded-full border border-white/10 shadow-sm"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-muted-foreground">
                              {entry.name}
                            </span>
                            <span className="font-semibold text-foreground">
                              ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <EmptyChartContent
                    message="ไม่มีข้อมูลช่องทางการชำระเงิน"
                    onResetRange={() => setDateRange("all")}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Trends & Order Growth */}
        <TabsContent value="trends" className="space-y-4 mt-0">
          <Card className="border-border/60 shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <LineIcon className="w-4 h-4 text-muted-foreground" />
                กราฟแสดงการเติบโตและจำนวนออเดอร์รายวัน
              </CardTitle>
              <CardDescription className="text-xs">
                วิเคราะห์ปริมาณออเดอร์ที่เข้ามาในแต่ละวัน
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[380px]">
              {metrics.salesTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics.salesTrends}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorOrdersMuted"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#a1a1aa"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="#a1a1aa"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.1}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) =>
                        format(parseISO(val), "d MMM", { locale: th })
                      }
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      className="fill-muted-foreground font-medium"
                    />
                    <YAxis
                      fontSize={11}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      className="fill-muted-foreground"
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name="จำนวนออเดอร์"
                      stroke="#a1a1aa"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrdersMuted)"
                      activeDot={{
                        r: 5,
                        stroke: "#d4d4d8",
                        strokeWidth: 2,
                        fill: "#71717a",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartContent
                  message="ไม่มีข้อมูลกราฟแนวโน้มการเติบโต"
                  onResetRange={() => setDateRange("all")}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Top Products Table */}
        <TabsContent value="products" className="space-y-4 mt-0">
          <EntityListCard
            title="อันดับสินค้าขายดี"
            description="รายการสินค้าเรียงตามยอดขายรวมที่เกิดขึ้นจริงในระบบ"
          >
            {metrics.topProducts.length > 0 ? (
              <div className="overflow-x-auto hide-scrollbar">
                <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">อันดับ</TableHead>
                    <TableHead>ชื่อสินค้า</TableHead>
                    <TableHead className="text-right">จำนวนที่ขายได้</TableHead>
                    <TableHead className="text-right">รายได้รวม (บาท)</TableHead>
                    <TableHead className="text-right">สัดส่วนยอดขาย</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topProducts.map((p, idx) => {
                    const share =
                      metrics.totalRevenue > 0
                        ? ((p.revenue / metrics.totalRevenue) * 100).toFixed(1)
                        : "0";
                    return (
                      <TableRow key={p.productId}>
                        <TableCell className="text-center font-bold text-muted-foreground">
                          #{idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {p.productName}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.quantity.toLocaleString()} ชิ้น
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-normal">
                            <Percent className="w-3 h-3 mr-1 text-muted-foreground" />
                            {share}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyChartContent
                message="ไม่พบข้อมูลสินค้าขายดีในช่วงเวลานี้"
                onResetRange={() => setDateRange("all")}
              />
            )}
          </EntityListCard>
        </TabsContent>
      </Tabs>

      {/* Business Insight Section - Low-Contrast Muted Dark Design */}
      <EntityListCard
        title="สรุปวิเคราะห์ข้อมูลธุรกิจ"
        description="ข้อเสนอแนะเชิงลึกเพื่อช่วยในการตัดสินใจเพิ่มยอดขายของคุณ"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
            <ArrowUpRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                สินค้าทำเงินสูงสุด
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {metrics.topProducts.length > 0 ? (
                  <>
                    สินค้า{" "}
                    <strong className="text-foreground">
                      "{metrics.topProducts[0]?.productName}"
                    </strong>{" "}
                    ทำรายได้สูงสุดอยู่ที่{" "}
                    <strong className="text-foreground">
                      {formatCurrency(metrics.topProducts[0]?.revenue)}
                    </strong>{" "}
                    แนะนำให้บริหารจัดการสต็อกของสินค้าชิ้นนี้อย่างสม่ำเสมอเพื่อไม่ให้เกิดสินค้าขาดตลาด
                  </>
                ) : (
                  "ยังไม่มีข้อมูลสินค้าที่ทำเงินสูงสุดในระบบ"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
            <HandCoins className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                พฤติกรรมการชำระเงิน
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                ลูกค้าส่วนใหญ่นิยมชำระด้วย{" "}
                <strong className="text-foreground">
                  {metrics.cashTotal >= metrics.promptpayTotal
                    ? "เงินสด"
                    : "พร้อมเพย์"}
                </strong>{" "}
                เป็นช่องทางหลัก ควรเตรียมทอนเงินสดหรือแสดงป้าย QR Code
                ชำระเงินให้เด่นชัดที่หน้าร้าน
              </p>
            </div>
          </div>
        </div>
      </EntityListCard>
    </Containers>
  );
}
