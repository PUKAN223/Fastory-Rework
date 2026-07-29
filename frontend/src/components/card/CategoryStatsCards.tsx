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
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">หมวดหมู่ทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {categoriesCount}
          </p>
          <TrendText value={categoriesDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าทั้งหมด</p>
          <p className="text-3xl font-semibold tracking-tight">
            {totalProducts}
          </p>
          <TrendText value={productsDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
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
