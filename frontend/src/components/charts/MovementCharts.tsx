"use client";

import { Activity, BarChart3, History } from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
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
import type { StockMovement } from "@/types/movements";

type MovementChartsProps = {
  movements: StockMovement[];
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const dataItem = payload[0]?.payload;
  const fullName = dataItem?.fullName || label;

  return (
    <div className="rounded-xl border border-border/80 bg-zinc-900/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-zinc-100">{fullName}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-zinc-400 mt-0.5">
          <span
            className="size-2.5 rounded-full border border-white/20 shadow-sm"
            style={{ background: p.stroke || p.fill || p.color }}
          />
          <span>{p.name}:</span>
          <span className="font-semibold text-zinc-100">{p.value} ยูนิต</span>
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
        ทำรายการปรับเพิ่ม/ลดสต็อกเพื่อเริ่มสร้างประวัติสถิติการเคลื่อนไหว
      </p>
    </div>
  );
}

export function MovementCharts({ movements }: MovementChartsProps) {
  // Timeline Data: Group by Date (YYYY-MM-DD)
  const timelineData = useMemo(() => {
    const map: Record<
      string,
      { date: string; displayDate: string; stockIn: number; stockOut: number }
    > = {};

    const sorted = [...movements].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const m of sorted) {
      const d = new Date(m.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
      });

      if (!map[key]) {
        map[key] = { date: key, displayDate, stockIn: 0, stockOut: 0 };
      }

      if (m.delta > 0) {
        map[key].stockIn += m.delta;
      } else {
        map[key].stockOut += Math.abs(m.delta);
      }
    }

    return Object.values(map);
  }, [movements]);

  // Top Moved Products
  const topMovedProducts = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        fullName: string;
        totalMovements: number;
        totalVolume: number;
      }
    > = {};

    for (const m of movements) {
      const key = m.productSku || m.productName;
      let shortName = m.productName.replace(
        /^(โมเมนโต|โลตัส|คนอร์|ตรา|ฉัตร)\s*/i,
        "",
      );
      if (shortName.length > 10) shortName = `${shortName.slice(0, 10)}...`;

      if (!map[key]) {
        map[key] = {
          name: shortName,
          fullName: m.productName,
          totalMovements: 0,
          totalVolume: 0,
        };
      }
      map[key].totalMovements += 1;
      map[key].totalVolume += Math.abs(m.delta);
    }

    return Object.values(map)
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 6);
  }, [movements]);

  if (movements.length === 0) {
    return (
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            สถิติและกราฟประวัติสต็อก
          </CardTitle>
          <CardDescription className="text-xs">
            แสดงข้อมูลเชิงลึกเมื่อมีรายการเคลื่อนไหวสต็อก
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <EmptyChartContent message="ไม่พบข้อมูลประวัติสต็อกในระบบเพื่อนำมาแสดงกราฟ" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
      {/* Chart 1: Area Chart - Movements Timeline */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">
              แนวโน้มการเคลื่อนไหวสต็อก (รับเข้า - จ่ายออก)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            ปริมาณยูนิตสต็อกที่รับเข้าและจ่ายออกตามช่วงเวลา
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          {timelineData.length === 0 ? (
            <EmptyChartContent message="ไม่มีข้อมูลการเคลื่อนไหวในช่วงเวลานี้" />
          ) : (
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="h-64 min-w-[520px] sm:min-w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <defs>
                    <linearGradient
                      id="inGradientEmerald"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#10B981"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="#10B981"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="outGradientRose"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#F43F5E"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="displayDate"
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
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stockIn"
                    name="รับเข้า (+)"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#inGradientEmerald)"
                    activeDot={{
                      r: 6,
                      stroke: "#10B981",
                      strokeWidth: 2,
                      fill: "#059669",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stockOut"
                    name="จ่ายออก (-)"
                    stroke="#F43F5E"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#outGradientRose)"
                    activeDot={{
                      r: 6,
                      stroke: "#F43F5E",
                      strokeWidth: 2,
                      fill: "#E11D48",
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Bar Chart - Top Moved Items Volume */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-purple-400" />
            <CardTitle className="text-sm font-medium">
              สินค้าที่มีปริมาณหมุนเวียนมากที่สุด (Top 6)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            คำนวณจากปริมาณรวมของยูนิตสต็อกที่มีการเปลี่ยนแปลง
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          {topMovedProducts.length === 0 ? (
            <EmptyChartContent message="ยังไม่มีสินค้าที่มีการหมุนเวียนสต็อก" />
          ) : (
            <div className="overflow-x-auto no-scrollbar pb-2">
              <div className="h-64 min-w-[520px] sm:min-w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topMovedProducts}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <defs>
                    <linearGradient
                      id="purpleBarGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#C084FC" stopOpacity={0.9} />
                      <stop
                        offset="100%"
                        stopColor="#7E22CE"
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
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="totalVolume"
                    name="ปริมาณหมุนเวียนรวม"
                    fill="url(#purpleBarGradient)"
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
    </div>
  );
}
