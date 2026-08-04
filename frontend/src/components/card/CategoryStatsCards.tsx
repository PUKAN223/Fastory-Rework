import { Card, CardContent } from "@/components/ui/card";
import { TrendText } from "./TrendText";

type CategoryStatsCardsProps = {
  categoriesCount: number;
  totalProducts: number;
  latestCategoryName: string;
  categoriesDelta: number;
  productsDelta: number;
};

export function CategoryStatsCards({
  categoriesCount,
  totalProducts,
  latestCategoryName,
  categoriesDelta,
  productsDelta,
}: CategoryStatsCardsProps) {
  return (
    <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">หมวดหมู่ทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {categoriesCount}
          </p>
          <TrendText value={categoriesDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {totalProducts}
          </p>
          <TrendText value={productsDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">หมวดหมู่ล่าสุด</p>
          <p className="truncate text-3xl font-semibold tracking-tight">
            {latestCategoryName}
          </p>
          <p className="text-xs text-muted-foreground">
            อัปเดตอัตโนมัติจากรายการล่าสุด
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
