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
    <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">คลังทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {warehousesCount}
          </p>
          <TrendText value={warehousesDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">ความจุรวม</p>
          <p className="text-3xl font-semibold tracking-tight">
            {totalCapacity}
          </p>
          <TrendText value={capacityDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
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
