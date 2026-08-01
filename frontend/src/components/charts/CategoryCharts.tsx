"use client";

import { BarChart3, FolderTree, PieChart as PieIcon } from "lucide-react";
import { useMemo } from "react";
import {
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
import type { Category } from "@/types/categories";

type CategoryChartsProps = {
  categories: Category[];
};

const CATEGORY_PIE_PALETTE = [
  "#6366F1", // Indigo
  "#38BDF8", // Sky
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const dataItem = payload[0]?.payload;
  const fullName = dataItem?.fullName || label || payload[0]?.name;

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
          <span className="font-semibold text-zinc-100">{p.value} รายการ</span>
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
        สร้างหมวดหมู่และจัดสรรสินค้าเพื่อดูสถิติในรูปแบบกราฟ
      </p>
    </div>
  );
}

export function CategoryCharts({ categories }: CategoryChartsProps) {
  const chartData = useMemo(() => {
    return [...categories]
      .map((c) => {
        let shortName = c.name;
        if (shortName.length > 14) shortName = `${shortName.slice(0, 14)}...`;
        return {
          name: shortName,
          fullName: c.name,
          count: c.productCount,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [categories]);

  const topCategoriesPie = useMemo(() => {
    const sorted = [...chartData].filter((c) => c.count > 0);
    if (sorted.length <= 5) return sorted;
    const top5 = sorted.slice(0, 5);
    const othersCount = sorted.slice(5).reduce((sum, c) => sum + c.count, 0);
    if (othersCount > 0) {
      top5.push({ name: "อื่นๆ", fullName: "หมวดหมู่อื่นๆ", count: othersCount });
    }
    return top5;
  }, [chartData]);

  const totalCategoryProducts = useMemo(
    () => topCategoriesPie.reduce((acc, curr) => acc + curr.count, 0),
    [topCategoriesPie],
  );
  const hasProductAssignments = useMemo(
    () => categories.some((c) => c.productCount > 0),
    [categories],
  );

  if (categories.length === 0) {
    return (
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            สถิติและกราฟวิเคราะห์หมวดหมู่สินค้า
          </CardTitle>
          <CardDescription className="text-xs">
            แสดงข้อมูลเชิงลึกเมื่อมีหมวดหมู่ในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyChartContent message="ไม่พบข้อมูลหมวดหมู่สินค้าในระบบเพื่อนำมาแสดงกราฟ" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Chart 1: Horizontal Bar Chart */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FolderTree className="size-4 text-indigo-400" />
            <CardTitle className="text-sm font-medium">
              จำนวนสินค้าในแต่ละหมวดหมู่
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            เรียงลำดับตามจำนวนสินค้าที่มีอยู่ในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasProductAssignments ? (
            <EmptyChartContent message="ยังไม่มีสินค้าถูกจัดสรรลงในหมวดหมู่" />
          ) : (
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData.slice(0, 8)}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient
                      id="catBarGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
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
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    className="text-[11px] fill-muted-foreground font-medium"
                    width={95}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="จำนวนสินค้า"
                    fill="url(#catBarGradient)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Donut Chart Distribution with Center Stats */}
      <Card className="border-border/60 shadow-none">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieIcon className="size-4 text-sky-400" />
            <CardTitle className="text-sm font-medium">
              สัดส่วนสินค้าตามหมวดหมู่ (Top 5)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            สัดส่วนจำนวนสินค้าคิดเป็นเปอร์เซ็นต์
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topCategoriesPie.length === 0 ? (
            <EmptyChartContent message="ยังไม่มีสัดส่วนสินค้าในหมวดหมู่" />
          ) : (
            <>
              <div className="relative h-48 w-full">
                {/* Center Stat Number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {totalCategoryProducts}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    สินค้ารวม
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategoriesPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {topCategoriesPie.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            CATEGORY_PIE_PALETTE[
                              index % CATEGORY_PIE_PALETTE.length
                            ]
                          }
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 text-xs">
                {topCategoriesPie.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full border border-white/10 shadow-sm"
                      style={{
                        backgroundColor:
                          CATEGORY_PIE_PALETTE[
                            index % CATEGORY_PIE_PALETTE.length
                          ],
                      }}
                    />
                    <span className="text-muted-foreground truncate max-w-[90px]">
                      {entry.name}
                    </span>
                    <span className="font-semibold text-foreground">
                      ({entry.count})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
