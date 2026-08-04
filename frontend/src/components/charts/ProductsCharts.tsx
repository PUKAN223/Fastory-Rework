"use client";

import {
  BarChart3,
  Package,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/products";

type ProductsChartsProps = {
  products: Product[];
};

// Semantic Status Colors
const STATUS_COLORS: Record<string, string> = {
  สินค้าพร้อมขาย: "#10B981", // Emerald Green
  ปิดใช้งาน: "#EF4444", // Red
  สต็อกต่ำกว่ากำหนด: "#F59E0B", // Amber Yellow
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const dataItem = payload[0]?.payload;
  const fullName = dataItem?.fullName || label || payload[0]?.name;

  return (
    <div className="rounded-xl border border-border/80 bg-zinc-900/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-zinc-100 max-w-[220px] break-words">
        {fullName}
      </p>
      {dataItem?.sku && (
        <p className="mb-1 text-[11px] text-zinc-400">
          SKU: <span className="font-mono text-zinc-200">{dataItem.sku}</span>
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-zinc-400 mt-0.5">
          <span
            className="size-2.5 rounded-full border border-white/20 shadow-sm"
            style={{ background: p.fill || p.color }}
          />
          <span>{p.name}:</span>
          <span className="font-semibold text-zinc-100">
            {typeof p.value === "number" && p.name.includes("มูลค่า")
              ? formatCurrency(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyChartContent({
  message = "ไม่มีข้อมูลเพียงพอสำหรับการแสดงกราฟ",
}: {
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground mb-2 shadow-inner">
        <BarChart3 className="size-5" />
      </div>
      <p className="text-xs font-medium text-foreground">{message}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
        เพิ่มหรืออัปเดตข้อมูลสินค้าในระบบเพื่อดูสถิติในรูปแบบกราฟ
      </p>
    </div>
  );
}

export function ProductsCharts({ products }: ProductsChartsProps) {
  // Top 6 products by total value (stockOnHand * sellingPrice)
  const topValuedProducts = useMemo(() => {
    return [...products]
      .map((p) => {
        // Smart truncation: strip common prefixes to show unique item names
        let shortName = p.name.replace(/^(โมเมนโต|โลตัส|คนอร์|ตรา|ฉัตร)\s*/i, "");
        shortName =
          shortName.length > 10 ? `${shortName.slice(0, 10)}...` : shortName;
        return {
          name: shortName,
          fullName: p.name,
          sku: p.sku,
          totalValue: p.stockOnHand * p.sellingPrice,
          stock: p.stockOnHand,
        };
      })
      .filter((p) => p.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 6);
  }, [products]);

  // Product status breakdown
  const statusData = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let lowStock = 0;

    for (const p of products) {
      if (!p.isActive) {
        inactive++;
      } else {
        active++;
      }
      if (p.stockOnHand <= p.reorderPoint && p.reorderPoint > 0) {
        lowStock++;
      }
    }

    return [
      {
        name: "สินค้าพร้อมขาย",
        value: active,
        fill: STATUS_COLORS["สินค้าพร้อมขาย"],
      },
      {
        name: "สต็อกต่ำกว่ากำหนด",
        value: lowStock,
        fill: STATUS_COLORS["สต็อกต่ำกว่ากำหนด"],
      },
      { name: "ปิดใช้งาน", value: inactive, fill: STATUS_COLORS["ปิดใช้งาน"] },
    ].filter((d) => d.value > 0);
  }, [products]);

  const totalStatusCount = useMemo(
    () => statusData.reduce((acc, curr) => acc + curr.value, 0),
    [statusData],
  );

  // Stock Distribution (Price vs Stock)
  const priceRangeData = useMemo(() => {
    const ranges = [
      { range: "0 - 100 ฿", count: 0 },
      { range: "101 - 500 ฿", count: 0 },
      { range: "501 - 1,000 ฿", count: 0 },
      { range: "1,000+ ฿", count: 0 },
    ];
    for (const p of products) {
      if (p.sellingPrice <= 100) ranges[0].count++;
      else if (p.sellingPrice <= 500) ranges[1].count++;
      else if (p.sellingPrice <= 1000) ranges[2].count++;
      else ranges[3].count++;
    }
    return ranges;
  }, [products]);

  const hasPriceData = useMemo(
    () => priceRangeData.some((r) => r.count > 0),
    [priceRangeData],
  );

  if (products.length === 0) {
    return (
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            สถิติและกราฟวิเคราะห์สินค้า
          </CardTitle>
          <CardDescription className="text-xs">
            แสดงข้อมูลเชิงลึกเมื่อมีสินค้าในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <EmptyChartContent message="ไม่พบข้อมูลสินค้าในระบบเพื่อนำมาแสดงกราฟ" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
      {/* Chart 1: Bar Chart - Top Valued Products */}
      <Card className="border-border/60 shadow-none lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-indigo-400" />
            <CardTitle className="text-sm font-medium">
              มูลค่าสินค้าในสต็อกสูงสุด (Top 6)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            คำนวณจาก (ราคาขาย × จำนวนสต็อก)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          {topValuedProducts.length === 0 ? (
            <EmptyChartContent message="ยังไม่มีสินค้าที่มีจำนวนสต็อกและมูลค่าเพียงพอ" />
          ) : (
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="h-60 min-w-[520px] sm:min-w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topValuedProducts}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientIndigo"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.9} />
                      <stop
                        offset="100%"
                        stopColor="#4F46E5"
                        stopOpacity={0.65}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    className="text-[11px] fill-muted-foreground font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground"
                    tickFormatter={(v) =>
                      `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="totalValue"
                    name="มูลค่าสต็อก"
                    fill="url(#barGradientIndigo)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Donut Chart - Status Breakdown with Center Stat */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieIcon className="size-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">
              สัดส่วนสถานะสินค้า
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            จำแนกตามสถานะการเปิดใช้งานและสต็อกต่ำ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          {statusData.length === 0 ? (
            <EmptyChartContent message="ไม่มีข้อมูลสถานะสินค้าเพียงพอ" />
          ) : (
            <>
              <div className="relative h-44 w-full">
                {/* Center Stat Number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {totalStatusCount}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    รายการทั้งหมด
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border border-white/10 shadow-sm"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-semibold text-foreground">
                      ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Chart 3: Area Chart - Price Range Distribution */}
      <Card className="border-border/60 shadow-none lg:col-span-3 min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-sky-400" />
            <CardTitle className="text-sm font-medium">
              การกระจายตัวของระดับราคาสินค้า
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            จำนวนรายการสินค้าแบ่งตามช่วงราคาขาย
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          {!hasPriceData ? (
            <EmptyChartContent message="ยังไม่มีข้อมูลระดับราคาสินค้า" />
          ) : (
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="h-48 min-w-[520px] sm:min-w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={priceRangeData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="priceGradientSky"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#38BDF8"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#38BDF8"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="range"
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground font-medium"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="จำนวนสินค้า"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#priceGradientSky)"
                    activeDot={{
                      r: 6,
                      stroke: "#38BDF8",
                      strokeWidth: 2,
                      fill: "#0ea5e9",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
