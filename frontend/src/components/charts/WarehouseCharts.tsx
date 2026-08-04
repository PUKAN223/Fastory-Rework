"use client";

import { BarChart3, Building2, Percent } from "lucide-react";
import { useMemo } from "react";
import {
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
import type { Warehouse } from "@/types/locations";

type WarehouseChartsProps = {
  warehouses: Warehouse[];
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
            style={{ background: p.fill || p.color }}
          />
          <span>{p.name}:</span>
          <span className="font-semibold text-zinc-100">
            {p.value} {p.name.includes("อัตรา") ? "%" : "ยูนิต"}
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
        สร้างคลังสินค้าและกำหนดสินค้าเพื่อดูสถิติในรูปแบบกราฟ
      </p>
    </div>
  );
}

export function WarehouseCharts({ warehouses }: WarehouseChartsProps) {
  const chartData = useMemo(() => {
    return warehouses.map((w) => {
      const stock = w.stockTotal ?? 0;
      const cap = w.maxCapacity;
      const utilPercent =
        cap > 0 ? Math.min(100, Math.round((stock / cap) * 100)) : 0;

      // Clean short name: "ที่เก็บสินค้า 1" -> "คลัง 1"
      let shortName = w.name.replace(/^ที่เก็บสินค้า\s*/i, "คลัง ");
      if (shortName.length > 8) shortName = `${shortName.slice(0, 8)}...`;

      return {
        name: shortName,
        fullName: w.name,
        stockTotal: stock,
        maxCapacity: cap,
        utilization: utilPercent,
      };
    });
  }, [warehouses]);

  if (warehouses.length === 0) {
    return (
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            สถิติและกราฟวิเคราะห์คลังสินค้า
          </CardTitle>
          <CardDescription className="text-xs">
            แสดงข้อมูลเชิงลึกเมื่อมีคลังสินค้าในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <EmptyChartContent message="ไม่พบข้อมูลคลังสินค้าในระบบเพื่อนำมาแสดงกราฟ" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
      {/* Chart 1: Dual Bar Chart (Used vs Max Capacity) */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-emerald-400" />
            <CardTitle className="text-sm font-medium">
              เปรียบเทียบสต็อกจริง vs ความจุสูงสุด
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            จำนวนสินค้าที่มีจริงในแต่ละคลังเทียบกับขีดความจุ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <div className="overflow-x-auto no-scrollbar pb-2">
            <div className="h-64 min-w-[520px] sm:min-w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
              >
                <defs>
                  <linearGradient
                    id="stockBarGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                    <stop
                      offset="100%"
                      stopColor="#059669"
                      stopOpacity={0.65}
                    />
                  </linearGradient>
                  <linearGradient
                    id="capBarGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#64748B" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#334155" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  angle={-15}
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
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="stockTotal"
                  name="สต็อกใช้งานจริง"
                  fill="url(#stockBarGradient)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="maxCapacity"
                  name="ความจุสูงสุด"
                  fill="url(#capBarGradient)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart 2: Utilization % Bar Chart */}
      <Card className="border-border/60 shadow-none min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Percent className="size-4 text-sky-400" />
            <CardTitle className="text-sm font-medium">
              อัตราการใช้งานความจุคลัง (%)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            เปอร์เซ็นต์การใช้งานพื้นที่จัดเก็บในแต่ละคลัง
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <div className="overflow-x-auto no-scrollbar pb-2">
            <div className="h-64 min-w-[520px] sm:min-w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
              >
                <defs>
                  <linearGradient
                    id="utilGradientSky"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.9} />
                    <stop
                      offset="100%"
                      stopColor="#0284C7"
                      stopOpacity={0.65}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  className="text-[11px] fill-muted-foreground font-medium"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] fill-muted-foreground"
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="utilization"
                  name="อัตราการใช้งาน"
                  fill="url(#utilGradientSky)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
