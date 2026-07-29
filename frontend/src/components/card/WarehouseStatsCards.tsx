import { Card, CardContent } from "@/components/ui/card";
import { TrendText } from "./TrendText";

type WarehouseStatsCardsProps = {
  warehousesCount: number;
  totalCapacity: number;
  latestWarehouseName: string;
  warehousesDelta: number;
  capacityDelta: number;
};

export function WarehouseStatsCards({
  warehousesCount,
  totalCapacity,
  latestWarehouseName,
  warehousesDelta,
  capacityDelta,
}: WarehouseStatsCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">คลังทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {warehousesCount}
          </p>
          <TrendText value={warehousesDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">ความจุรวม</p>
          <p className="text-3xl font-semibold tracking-tight">
            {totalCapacity}
          </p>
          <TrendText value={capacityDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">คลังล่าสุด</p>
          <p className="truncate text-3xl font-semibold tracking-tight">
            {latestWarehouseName}
          </p>
          <p className="text-xs text-muted-foreground">
            อัปเดตอัตโนมัติจากรายการล่าสุด
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
