"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DEFAULT_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

interface AiChartCardProps {
  type: "bar" | "line" | "pie" | "area" | string;
  title?: string;
  data: any[];
  xKey?: string;
  dataKeys?: string[];
  labels?: string[];
  colors?: string[];
}

export const AiChartCard: React.FC<AiChartCardProps> = ({
  type = "bar",
  title = "กราฟสรุปข้อมูล",
  data = [],
  xKey = "name",
  dataKeys = [],
  labels = [],
  colors = DEFAULT_COLORS,
}) => {
  const chartType = (type || "bar").toLowerCase();

  const safeXKey = React.useMemo(() => {
    if (xKey && data && data.length > 0 && xKey in data[0]) return xKey;
    if (data && data.length > 0 && typeof data[0] === "object") {
      const keys = Object.keys(data[0]);
      // Return first key that is not numeric or returns first key
      return (
        keys.find((k) => typeof data[0][k] === "string") || keys[0] || "name"
      );
    }
    return "name";
  }, [xKey, data]);

  const safeDataKeys = React.useMemo(() => {
    if (dataKeys && dataKeys.length > 0) return dataKeys;
    if (data && data.length > 0 && typeof data[0] === "object") {
      const keys = Object.keys(data[0]).filter((k) => k !== safeXKey);
      const numKeys = keys.filter(
        (k) => typeof data[0][k] === "number" || !isNaN(Number(data[0][k])),
      );
      return numKeys.length > 0 ? numKeys : keys.slice(0, 2);
    }
    return ["value"];
  }, [dataKeys, data, safeXKey]);

  const getLabel = (key: string, index: number) => {
    if (labels && labels[index]) return labels[index];
    return key;
  };

  const getColor = (index: number) => {
    return (
      colors[index % colors.length] ||
      DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    );
  };

  const getIcon = () => {
    switch (chartType) {
      case "line":
        return <TrendingUp className="size-4" />;
      case "pie":
        return <PieIcon className="size-4" />;
      case "area":
        return <Activity className="size-4" />;
      default:
        return <BarChart3 className="size-4" />;
    }
  };

  const getBadgeLabel = () => {
    switch (chartType) {
      case "line":
        return "Line Chart";
      case "pie":
        return "Pie Chart";
      case "area":
        return "Area Chart";
      default:
        return "Bar Chart";
    }
  };

  const formatTooltipValue = (value: any) => {
    if (typeof value === "number") {
      return new Intl.NumberFormat("th-TH").format(value);
    }
    return value;
  };

  return (
    <div className="my-4 border rounded-xl bg-card shadow-sm overflow-hidden flex flex-col gap-0 border-border/80">
      {/* Card Header */}
      <div className="p-3.5 bg-muted/30 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {getIcon()}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground">
              จำนวนข้อมูล {data.length} รายการ
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] font-normal uppercase tracking-wider"
        >
          {getBadgeLabel()}
        </Badge>
      </div>

      {/* Chart Canvas */}
      <div className="p-4 w-full h-[280px]">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey={safeXKey} tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatTooltipValue}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatTooltipValue(val),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                {safeDataKeys.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={getLabel(key, idx)}
                    stroke={getColor(idx)}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  {safeDataKeys.map((key, idx) => (
                    <linearGradient
                      key={key}
                      id={`grad-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={getColor(idx)}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={getColor(idx)}
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey={safeXKey} tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatTooltipValue}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatTooltipValue(val),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                {safeDataKeys.map((key, idx) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={getLabel(key, idx)}
                    stroke={getColor(idx)}
                    fillOpacity={1}
                    fill={`url(#grad-${key})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            ) : chartType === "pie" ? (
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatTooltipValue(val),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey={safeDataKeys[0] || "value"}
                  nameKey={safeXKey}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(index)} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              /* Bar Chart (Default) */
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey={safeXKey} tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatTooltipValue}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    formatTooltipValue(val),
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                {safeDataKeys.map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={getLabel(key, idx)}
                    fill={getColor(idx)}
                    radius={[6, 6, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            ไม่มีข้อมูลสำหรับแสดงกราฟ
          </div>
        )}
      </div>
    </div>
  );
};
