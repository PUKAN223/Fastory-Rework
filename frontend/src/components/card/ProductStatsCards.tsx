import { Card, CardContent } from "@/components/ui/card";
import { TrendText } from "./TrendText";

type ProductStatsCardsProps = {
  productsCount: number;
  activeProductsCount: number;
  totalProductsValue: string;
  latestProductName: string;
  lowStockCount: number;
  productsDelta: number;
  activeDelta: number;
  valueDelta: number;
};

export function ProductStatsCards({
  productsCount,
  activeProductsCount,
  totalProductsValue,
  latestProductName,
  lowStockCount,
  productsDelta,
  activeDelta,
  valueDelta,
}: ProductStatsCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">จำนวนสินค้า</p>
          <p className="text-3xl font-semibold tracking-tight">
            {productsCount}
          </p>
          <TrendText value={productsDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">เปิดใช้งาน</p>
          <p className="text-3xl font-semibold tracking-tight">
            {activeProductsCount}
          </p>
          <TrendText value={activeDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">มูลค่าราคาขายรวม</p>
          <p className="text-3xl font-semibold tracking-tight">
            {totalProductsValue}
          </p>
          <TrendText value={valueDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าสต็อกต่ำ</p>
          <p
            className={`text-3xl font-semibold tracking-tight ${lowStockCount > 0 ? "text-destructive" : ""}`}
          >
            {lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {lowStockCount > 0 ? "ต้องเร่งเติมสินค้าคงคลัง" : "คลังสินค้าปกติ"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าล่าสุด</p>
          <p className="truncate text-3xl font-semibold tracking-tight">
            {latestProductName}
          </p>
          <p className="text-xs text-muted-foreground">
            อัปเดตอัตโนมัติจากรายการล่าสุด
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
