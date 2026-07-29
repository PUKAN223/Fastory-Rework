"use client";

import { format, isAfter, parseISO, subDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Filter,
  HandCoins,
  LineChart as LineIcon,
  Percent,
  PieChart as PieIcon,
  TrendingUp,
  Users,
} from "lucide-react";
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

  const paymentChartData = [
    { name: "เงินสด", value: metrics.cashTotal, color: "#10b981" },
    { name: "พร้อมเพย์", value: metrics.promptpayTotal, color: "#3b82f6" },
  ];

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
        {activeStore && (
          <Badge variant="secondary" className="px-3 py-1 font-medium">
            ร้าน: {activeStore.name}
          </Badge>
        )}
        <Badge variant="outline" className="px-3 py-1">
          ช่วงเวลา:{" "}
          {dateRange === "7d"
            ? "7 วันล่าสุด"
            : dateRange === "30d"
              ? "30 วันล่าสุด"
              : "ทั้งหมด"}
        </Badge>
      </PageHeaderCards>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">ตัวกรองช่วงเวลา:</span>
          <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-2">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="w-auto"
          >
            <TabsList className="h-8">
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

      {/* KPI Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดขายรวม</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              จากทั้งหมด {metrics.totalOrders} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนคำสั่งซื้อ</CardTitle>
            <HandCoins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalOrders.toLocaleString()} รายการ
            </div>
            <p className="text-xs text-muted-foreground mt-1">สถานะเสร็จสมบูรณ์</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ยอดสั่งซื้อเฉลี่ย (AOV)
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.aov)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">เฉลี่ยต่อคำสั่งซื้อ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ยอดสั่งซื้อสูงสุดในบิลเดียว
            </CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.maxOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">มูลค่าบิลสูงสุด</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4 mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Sales Bar Chart */}
            <Card className="col-span-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    แนวโน้มยอดขายตามวันที่
                  </CardTitle>
                  <CardDescription>
                    กราฟแท่งแสดงยอดขายรวมรายวันในช่วงเวลาที่เลือก
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="h-[320px]">
                {metrics.salesTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.salesTrends}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) =>
                          format(parseISO(val), "d MMM", { locale: th })
                        }
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `฿${val.toLocaleString()}`}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) =>
                          format(parseISO(label), "d MMMM yyyy", { locale: th })
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="currentColor"
                        radius={[4, 4, 0, 0]}
                        className="fill-primary"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    ไม่มีข้อมูลยอดขายในช่วงเวลาที่เลือก
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods Donut Chart */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-primary" />
                  สัดส่วนช่องทางการชำระเงิน
                </CardTitle>
                <CardDescription>
                  เปรียบเทียบการชำระด้วยเงินสดและพร้อมเพย์
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                {metrics.totalRevenue > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {paymentChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-6 mt-2">
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
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}</span>
                            <span className="text-muted-foreground">
                              ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    ไม่มีข้อมูลช่องทางการชำระเงิน
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Trends & Order Growth */}
        <TabsContent value="trends" className="space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineIcon className="w-5 h-5 text-primary" />
                กราฟแสดงการเติบโตและจำนวนออเดอร์รายวัน
              </CardTitle>
              <CardDescription>
                วิเคราะห์ปริมาณออเดอร์ที่เข้ามาในแต่ละวัน
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[380px]">
              {metrics.salesTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metrics.salesTrends}
                    margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorOrders"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) =>
                        format(parseISO(val), "d MMM", { locale: th })
                      }
                      fontSize={12}
                    />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(val: number) => [
                        `${val} ออเดอร์`,
                        "จำนวนออเดอร์",
                      ]}
                      labelFormatter={(label) =>
                        format(parseISO(label), "d MMMM yyyy", { locale: th })
                      }
                      contentStyle={{ borderRadius: "8px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                  ไม่มีข้อมูลกราฟแนวโน้ม
                </div>
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
              <Table>
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
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-normal">
                            <Percent className="w-3 h-3 mr-1" />
                            {share}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                ไม่พบข้อมูลสินค้าขายดีในช่วงเวลานี้
              </div>
            )}
          </EntityListCard>
        </TabsContent>
      </Tabs>

      {/* Business Insight Section */}
      <EntityListCard
        title="สรุปวิเคราะห์ข้อมูลธุรกิจ"
        description="ข้อเสนอแนะเชิงลึกเพื่อช่วยในการตัดสินใจเพิ่มยอดขายของคุณ"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ArrowUpRight className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                สินค้าทำเงินสูงสุด
              </h4>
              <p className="text-sm text-emerald-600/90 dark:text-emerald-400/90 mt-1">
                {metrics.topProducts.length > 0 ? (
                  <>
                    สินค้า{" "}
                    <strong>"{metrics.topProducts[0]?.productName}"</strong>{" "}
                    ทำรายได้สูงสุดอยู่ที่{" "}
                    <strong>
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

          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <HandCoins className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                พฤติกรรมการชำระเงิน
              </h4>
              <p className="text-sm text-blue-600/90 dark:text-blue-400/90 mt-1">
                ลูกค้าส่วนใหญ่นิยมชำระด้วย{" "}
                <strong>
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
