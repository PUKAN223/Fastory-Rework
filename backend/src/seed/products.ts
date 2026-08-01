import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../db/client";

export const sampleProducts = [
  // ขนมและอาหาร
  { categoryName: "โปรขนม อาหาร", sku: "SNK-001", name: "เลย์ มันฝรั่งทอดกรอบ รสออริจินัล 42ก.", costPrice: 15, sellingPrice: 20, stock: 30, reorderPoint: 5 },
  { categoryName: "โปรขนม อาหาร", sku: "SNK-002", name: "ทาโร ปลาสวรรค์ รสเข้มข้น 30ก.", costPrice: 16, sellingPrice: 22, stock: 30, reorderPoint: 5 },
  { categoryName: "โปรขนม อาหาร", sku: "SNK-003", name: "ยูโร่เค้ก พัฟเค้กสอดไส้ครีมคัสตาร์ด (แพ็ก 12)", costPrice: 48, sellingPrice: 65, stock: 20, reorderPoint: 5 },
  
  // เครื่องดื่ม
  { categoryName: "น้ำ เครื่องดื่มและผงชงดื่ม", sku: "DRK-001", name: "โค้ก สูตรไม่มีน้ำตาล 325มล.", costPrice: 11, sellingPrice: 15, stock: 40, reorderPoint: 10 },
  { categoryName: "น้ำ เครื่องดื่มและผงชงดื่ม", sku: "DRK-002", name: "สไปรท์ ออริจินัล 325มล.", costPrice: 11, sellingPrice: 15, stock: 30, reorderPoint: 5 },
  { categoryName: "น้ำ เครื่องดื่มและผงชงดื่ม", sku: "DRK-003", name: "อิชิตัน ชากรีนที รสน้ำผึ้งผสมมะนาว 500มล.", costPrice: 14, sellingPrice: 20, stock: 30, reorderPoint: 5 },
  { categoryName: "น้ำ เครื่องดื่มและผงชงดื่ม", sku: "DRK-004", name: "เนสกาแฟ เบลนด์ แอนด์ บรู เอสเปรสโซ ซอง (27 ซอง)", costPrice: 85, sellingPrice: 109, stock: 20, reorderPoint: 5 },

  // นมสด
  { categoryName: "นมสด และ นมยูเอชที", sku: "MLK-001", name: "โฟร์โมสต์ นม UHT รสจืด 225มล. (แพ็ก 6)", costPrice: 52, sellingPrice: 68, stock: 30, reorderPoint: 5 },
  { categoryName: "นมสด และ นมยูเอชที", sku: "MLK-002", name: "ไวตามิ้ลค์ นมถั่วเหลือง UHT 250มล. (แพ็ก 4)", costPrice: 38, sellingPrice: 48, stock: 30, reorderPoint: 5 },

  // อาหารแห้งและเครื่องปรุง
  { categoryName: "อาหารแห้งและเครื่องปรุง", sku: "DRY-001", name: "มาม่า บะหมี่ต้มยำกุ้งน้ำข้น 55ก. (แพ็ก 10)", costPrice: 55, sellingPrice: 67, stock: 40, reorderPoint: 10 },
  { categoryName: "อาหารแห้งและเครื่องปรุง", sku: "DRY-002", name: "ตราฉัตร ข้าวหอมมะลิ 100% 5 กิโลกรัม", costPrice: 185, sellingPrice: 229, stock: 20, reorderPoint: 5 },
  { categoryName: "อาหารแห้งและเครื่องปรุง", sku: "DRY-003", name: "องุ่น น้ำมันถั่วเหลือง 1 ลิตร", costPrice: 42, sellingPrice: 55, stock: 30, reorderPoint: 5 },
  { categoryName: "อาหารแห้งและเครื่องปรุง", sku: "DRY-004", name: "ภูเขาทอง ซอสถั่วเหลืองฝาเขียว 600มล.", costPrice: 32, sellingPrice: 43, stock: 30, reorderPoint: 5 },

  // เนื้อสัตว์
  { categoryName: "เนื้อสัตว์", sku: "MEA-001", name: "สันนอกหมู สด 1 กิโลกรัม", costPrice: 130, sellingPrice: 165, stock: 20, reorderPoint: 5 },
  { categoryName: "เนื้อสัตว์", sku: "MEA-002", name: "อกไก่ลอกหนัง 1 กิโลกรัม", costPrice: 75, sellingPrice: 98, stock: 30, reorderPoint: 5 },

  // ผักและผลไม้
  { categoryName: "ผักและผลไม้", sku: "VEG-001", name: "กล้วยหอมทอง (หวี)", costPrice: 35, sellingPrice: 55, stock: 20, reorderPoint: 5 },
  { categoryName: "ผักและผลไม้", sku: "VEG-002", name: "แอปเปิลฟูจิ (แพ็ก 4 ลูก)", costPrice: 59, sellingPrice: 89, stock: 20, reorderPoint: 5 },

  // เบเกอรี่
  { categoryName: "เบเกอรี่", sku: "BAK-001", name: "ฟาร์มเฮ้าส์ ขนมปังแถวชนิดแผ่น 480ก.", costPrice: 34, sellingPrice: 42, stock: 30, reorderPoint: 5 },

  // ความงามและของใช้ส่วนตัว
  { categoryName: "ความงามและของใช้ส่วนตัว", sku: "BEA-001", name: "ซันซิล แชมพู สูตรรวมผมยาวสวย 400มล.", costPrice: 95, sellingPrice: 129, stock: 20, reorderPoint: 5 },
  { categoryName: "ความงามและของใช้ส่วนตัว", sku: "BEA-002", name: "คอลเกต ยาสีฟัน รสรสรสมินต์ 150ก. (แพ็กคู่)", costPrice: 79, sellingPrice: 99, stock: 30, reorderPoint: 5 },

  // ผลิตภัณฑ์ทำความสะอาด
  { categoryName: "ผลิตภัณฑ์ทำความสะอาด", sku: "CLN-001", name: "บรีส เอกเซล ผงซักฟอก สูตรเข้มข้น 1400ก.", costPrice: 119, sellingPrice: 149, stock: 20, reorderPoint: 5 },
  { categoryName: "ผลิตภัณฑ์ทำความสะอาด", sku: "CLN-002", name: "ซันไลต์ เลมอนเทอร์โบ น้ำยาล้างจาน 750มล.", costPrice: 38, sellingPrice: 49, stock: 30, reorderPoint: 5 },

  // อุปกรณ์อิเล็กทรอนิกส์
  { categoryName: "อุปกรณ์อิเล็กทรอนิกส์", sku: "ELE-001", name: "ปลั๊กไฟ 3 ตา 5 ช่อง สายยาว 3 เมตร TIS", costPrice: 160, sellingPrice: 249, stock: 20, reorderPoint: 5 },
  { categoryName: "อุปกรณ์อิเล็กทรอนิกส์", sku: "ELE-002", name: "สายชาร์จ Type-C Fast Charge 1 เมตร", costPrice: 45, sellingPrice: 89, stock: 30, reorderPoint: 5 }
];

export async function seedProducts(storeId: number, resetFirst = false) {
  if (resetFirst) {
    console.log(`🧹 Clearing existing products for store ID: ${storeId}...`);
    await prisma.product_stock_movements.deleteMany({ where: { store_id: storeId } });
    await prisma.order_items.deleteMany({ where: { order: { store_id: storeId } } });
    await prisma.products.deleteMany({ where: { store_id: storeId } });
  }

  // Fetch categories & locations for this store
  const storeCategories = await prisma.categories.findMany({
    where: { store_id: storeId }
  });

  const storeLocations = await prisma.locations.findMany({
    where: { store_id: storeId },
    include: { products: true },
    orderBy: { id: "asc" }
  });

  if (storeCategories.length === 0) {
    throw new Error(`No categories found for store ID ${storeId}. Please run seed:categories first.`);
  }

  const categoryMap = new Map(storeCategories.map((c) => [c.name, c.id]));
  const defaultCategoryId = storeCategories[0].id;

  const storeOwner = await prisma.store_members.findFirst({
    where: { store_id: storeId }
  });
  const userId = storeOwner?.user_id || 1;

  // Track location capacity in memory
  const locationUsageMap = new Map<number, { maxCap: number; currentStock: number }>();
  for (const loc of storeLocations) {
    const stockSum = loc.products.reduce((acc, p) => acc + p.stock_on_hand, 0);
    locationUsageMap.set(loc.id, { maxCap: loc.max_capacity, currentStock: stockSum });
  }

  const createdProducts = [];

  for (let idx = 0; idx < sampleProducts.length; idx++) {
    const item = sampleProducts[idx];
    const categoryId = categoryMap.get(item.categoryName) || defaultCategoryId;

    // Subtract old stock if existing
    const existing = await prisma.products.findUnique({
      where: {
        store_id_sku: {
          store_id: storeId,
          sku: item.sku
        }
      }
    });

    if (existing && existing.location_id && locationUsageMap.has(existing.location_id)) {
      const usage = locationUsageMap.get(existing.location_id)!;
      usage.currentStock = Math.max(0, usage.currentStock - existing.stock_on_hand);
    }

    // Select location with highest remaining capacity
    let targetLocationId: number | null = null;
    let availableCap = 0;

    for (const loc of storeLocations) {
      const usage = locationUsageMap.get(loc.id);
      if (!usage) continue;
      const rem = usage.maxCap - usage.currentStock;
      if (rem > availableCap) {
        availableCap = rem;
        targetLocationId = loc.id;
      }
    }

    if (!targetLocationId && storeLocations.length > 0) {
      targetLocationId = storeLocations[idx % storeLocations.length].id;
      const usage = locationUsageMap.get(targetLocationId);
      availableCap = usage ? Math.max(0, usage.maxCap - usage.currentStock) : 30;
    }

    // Determine safe stock (10 to 40, divisible by 10)
    let finalStock = Math.min(item.stock, availableCap);
    finalStock = Math.floor(finalStock / 10) * 10;
    if (finalStock <= 0 && availableCap >= 10) {
      finalStock = 10;
    }
    const reorderPoint = Math.max(5, Math.floor(finalStock * 0.2));

    if (targetLocationId && locationUsageMap.has(targetLocationId)) {
      const usage = locationUsageMap.get(targetLocationId)!;
      usage.currentStock += finalStock;
    }

    let product;
    if (existing) {
      product = await prisma.products.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          category_id: categoryId,
          location_id: targetLocationId,
          cost_price: item.costPrice,
          selling_price: item.sellingPrice,
          stock_on_hand: finalStock,
          reorder_point: reorderPoint
        }
      });
    } else {
      product = await prisma.products.create({
        data: {
          store_id: storeId,
          sku: item.sku,
          name: item.name,
          category_id: categoryId,
          location_id: targetLocationId,
          cost_price: item.costPrice,
          selling_price: item.sellingPrice,
          stock_on_hand: finalStock,
          reorder_point: reorderPoint
        }
      });

      await prisma.product_stock_movements.create({
        data: {
          store_id: storeId,
          product_id: product.id,
          delta: finalStock,
          reason: "เพิ่มสต็อกสินค้าเริ่มต้น",
          created_by: userId
        }
      });
    }

    createdProducts.push(product);
  }

  return createdProducts;
}

async function main() {
  console.log("🌱 --- Products Seeder ---");

  const availableStores = await prisma.stores.findMany({
    select: { id: true, name: true, slug: true }
  });

  if (availableStores.length === 0) {
    console.error("❌ No stores found in database. Please run main seed first (bun run seed).");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    console.log("\nAvailable stores in database:");
    availableStores.forEach((s) => console.log(`  - [ID: ${s.id}] ${s.name} (slug: ${s.slug})`));

    const defaultSlug = availableStores[0].slug;
    const storeInput = await rl.question(`\n📌 Enter Store Slug or Store ID (default: ${defaultSlug}): `);
    const targetQuery = storeInput.trim() || defaultSlug;

    let store = availableStores.find(
      (s) => s.slug.toLowerCase() === targetQuery.toLowerCase() || String(s.id) === targetQuery
    );

    if (!store) {
      const storeIdNum = Number.parseInt(targetQuery, 10);
      if (!Number.isNaN(storeIdNum)) {
        const found = await prisma.stores.findUnique({ where: { id: storeIdNum } });
        if (found) store = { id: found.id, name: found.name, slug: found.slug };
      } else {
        const found = await prisma.stores.findUnique({ where: { slug: targetQuery } });
        if (found) store = { id: found.id, name: found.name, slug: found.slug };
      }
    }

    if (!store) {
      console.error(`❌ Store "${targetQuery}" not found.`);
      process.exit(1);
    }

    console.log(`\n🎯 Selected Store: ${store.name} (ID: ${store.id}, Slug: ${store.slug})`);

    const resetAnswer = await rl.question("❓ Reset (delete all existing) products for this store first? (y/N): ");
    const resetFirst = resetAnswer.trim().toLowerCase() === "y" || resetAnswer.trim().toLowerCase() === "yes";

    console.log(`\n⏳ Seeding products (resetFirst: ${resetFirst})...`);
    const result = await seedProducts(store.id, resetFirst);

    console.log(`\n✅ Successfully seeded ${result.length} products for store "${store.name}"!`);
  } catch (error: any) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (import.meta.main) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
