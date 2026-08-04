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
    <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">จำนวนสินค้า</p>
          <p className="text-2xl 2xl:text-3xl font-semibold tracking-tight truncate" title={productsCount.toString()}>
            {productsCount}
          </p>
          <TrendText value={productsDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">เปิดใช้งาน</p>
          <p className="text-2xl 2xl:text-3xl font-semibold tracking-tight truncate" title={activeProductsCount.toString()}>
            {activeProductsCount}
          </p>
          <TrendText value={activeDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">มูลค่าราคาขายรวม</p>
          <p className="text-2xl 2xl:text-3xl font-semibold tracking-tight truncate" title={totalProductsValue}>
            {totalProductsValue}
          </p>
          <TrendText value={valueDelta} suffix="จากสัปดาห์ก่อน" />
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าสต็อกต่ำ</p>
          <p
            className={`text-2xl 2xl:text-3xl font-semibold tracking-tight truncate ${lowStockCount > 0 ? "text-destructive" : ""}`}
            title={lowStockCount.toString()}
          >
            {lowStockCount}
          </p>
          <p className="text-xs text-muted-foreground">
            {lowStockCount > 0 ? "ต้องเร่งเติมสินค้าคงคลัง" : "คลังสินค้าปกติ"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60 py-3 shadow-none min-w-fit md:min-w-0 shrink-0 md:shrink snap-start md:snap-align-none">
        <CardContent className="space-y-1 px-4">
          <p className="text-xs text-muted-foreground">สินค้าล่าสุด</p>
          <p className="text-2xl 2xl:text-3xl font-semibold tracking-tight truncate" title={latestProductName}>
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
