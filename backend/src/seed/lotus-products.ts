import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../db/client";
import { categoryData, seedCategories } from "./categories";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function findMatchingCategoryId(
  itemCategoryName: string,
  itemName: string,
  storeCategories: { id: number; name: string }[],
): number {
  if (storeCategories.length === 0) return 1;
  const defaultId = storeCategories[0].id;
  const combined = `${itemCategoryName} ${itemName}`.toLowerCase();

  // 1. Exact category name match
  const exact = storeCategories.find((c) =>
    c.name.toLowerCase() === itemCategoryName.toLowerCase()
  );
  if (exact) return exact.id;

  // 2. Keyword rules mapping to the 35 categories
  const rules: { keywords: string[]; categoryName: string }[] = [
    {
      keywords: ["ผัก", "ผลไม้", "สลัด", "แอปเปิ้ล", "ส้ม", "กล้วย"],
      categoryName: "ผักและผลไม้",
    },
    {
      keywords: ["หมู", "ไก่", "เนื้อ", "วัว", "สันนอก", "สันใน", "บด"],
      categoryName: "เนื้อสัตว์",
    },
    {
      keywords: ["ซีฟู้ด", "กุ้ง", "ปลา", "หมึก", "ปู", "แช่แข็ง", "แพนกาเซียส"],
      categoryName: "เทศกาลซีฟู้ด",
    },
    {
      keywords: ["นมสด", "นม uht", "ยูเอชที", "สเตอริไลส์", "พาสเจอร์ไรส์"],
      categoryName: "นมสด และ นมยูเอชที",
    },
    {
      keywords: ["ชีส", "เนย", "โยเกิร์ต", "เต้าหู้", "ไข่"],
      categoryName: "ไข่ ชีส เนยและโยเกิร์ต",
    },
    {
      keywords: ["เครื่องดื่ม", "น้ำดื่ม", "ชา", "กาแฟ", "ผงชง", "น้ำส้ม"],
      categoryName: "น้ำ เครื่องดื่มและผงชงดื่ม",
    },
    {
      keywords: ["ขนม", "สแน็ค", "เวเฟอร์", "คุ้กกี้", "ช็อกโกแลต", "แครกเกอร์"],
      categoryName: "ขนมและของหวาน",
    },
    {
      keywords: ["โจ๊ก", "บะหมี่", "อาหารแห้ง", "น้ำมัน", "เครื่องปรุง", "น้ำปลา", "ซอส"],
      categoryName: "อาหารแห้งและเครื่องปรุง",
    },
    {
      keywords: [
        "บิวตี้",
        "ผิว",
        "มาส์ก",
        "คลีนเซอร์",
        "สกินแคร์",
        "แชมพู",
        "โลชั่น",
        "สเปรย์",
        "ลิป",
        "เซรั่ม",
      ],
      categoryName: "ความงามและของใช้ส่วนตัว",
    },
    {
      keywords: ["ทำความสะอาด", "ซักผ้า", "ปรับผ้านุ่ม", "ล้างจาน", "ทิชชู่"],
      categoryName: "ผลิตภัณฑ์ทำความสะอาด",
    },
    {
      keywords: ["แม่และเด็ก", "ผ้าอ้อม", "เบบี้", "ทารก"],
      categoryName: "สินค้าสำหรับแม่และเด็ก",
    },
    { keywords: ["ผู้สูงอายุ", "ผู้ใหญ่"], categoryName: "ผลิตภัณฑ์ดูแลผู้สูงอายุ" },
    { keywords: ["สัตว์", "เพ็ท", "สุนัข", "แมว"], categoryName: "อาหารสัตว์" },
    {
      keywords: ["ผ้าปู", "เตียง", "ผ้านวม", "หมอน", "เฟอร์นิเจอร์"],
      categoryName: "บ้านและของตกแต่ง",
    },
    {
      keywords: ["แก้ว", "จาน", "ชาม", "กระทะ", "หม้อ", "ห้องครัว"],
      categoryName: "ห้องครัว",
    },
    {
      keywords: ["อิเล็กทรอนิกส์", "สายชาร์จ", "หูฟัง", "ไอที", "แกดเจ็ต"],
      categoryName: "อุปกรณ์อิเล็กทรอนิกส์",
    },
    {
      keywords: ["ทีวี", "พัดลม", "เตารีด", "เครื่องใช้ไฟฟ้า"],
      categoryName: "ทีวีและเครื่องใช้ไฟฟ้าในบ้าน",
    },
    { keywords: ["รถยนต์", "น้ำมันเครื่อง", "ยาง"], categoryName: "อุปกรณ์รถยนต์" },
    {
      keywords: ["เสื้อผ้า", "ชุด", "กางเกง", "เสื้อ"],
      categoryName: "เสื้อผ้าและเครื่องแต่งกาย",
    },
    {
      keywords: ["เครื่องเขียน", "สมุด", "ปากกา", "กระดาษ"],
      categoryName: "เครื่องเขียน",
    },
    { keywords: ["ซีพี", "cp"], categoryName: "ซีพี" },
    { keywords: ["โลตัส"], categoryName: "สินค้าแบรนด์ โลตัส" },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      const matchedCat = storeCategories.find((c) =>
        c.name === rule.categoryName
      );
      if (matchedCat) return matchedCat.id;
    }
  }

  // Fallback: Check substring match with any category name
  for (const cat of storeCategories) {
    if (combined.includes(cat.name.toLowerCase())) {
      return cat.id;
    }
  }

  return defaultId;
}

export async function fetchLotusProductInfo(productUrl: string) {
  try {
    let fullUrl = productUrl.trim();
    if (!fullUrl.startsWith("http")) {
      fullUrl = `https://www.lotuss.com/th/product/${fullUrl}`;
    }

    const res = await fetch(fullUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "th-TH,th;q=0.9",
      },
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
    );

    const urlClean = fullUrl.split("?")[0];
    const urlSegment = urlClean.split("/").pop() || "";
    const rawSku = urlSegment.split("-").pop() || "00000000";

    let name = "สินค้าโลตัส";
    let sellingPrice = 50;
    let categoryName = "โปรขนม อาหาร";
    let imageUrl = `https://o2o-static.lotuss.com/products/86587/${rawSku}.jpg`;

    if (nextDataMatch) {
      try {
        const json = JSON.parse(nextDataMatch[1]);
        const content = json.props?.pageProps?.page?.data?.content || [];

        let productDetail: any = null;
        for (const section of content) {
          if (section.productDetailSSR) {
            productDetail = section.productDetailSSR;
            break;
          }
        }

        if (productDetail) {
          if (productDetail.name) name = productDetail.name;
          if (productDetail.mediaGallery?.[0]?.url) {
            imageUrl = productDetail.mediaGallery[0].url;
          } else {
            imageUrl =
              `https://o2o-static.lotuss.com/products/86587/${rawSku}.jpg`;
          }
          const price =
            productDetail.priceRange?.minimumPrice?.finalPrice?.value ||
            productDetail.regularPricePerUOW;
          if (typeof price === "number" && price > 0) sellingPrice = price;
          if (productDetail.links?.category?.name) {
            categoryName = productDetail.links.category.name;
          }
        }
      } catch (err) {
        // parsing fallback
      }
    }

    // Fallback og:image check
    if (!imageUrl || imageUrl.includes("undefined")) {
      const ogImageMatch =
        html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
      if (ogImageMatch) imageUrl = ogImageMatch[1];
    }

    // If name was not found or remains generic fallback, skip so it does not count
    if (!name || name === "สินค้าโลตัส") {
      return null;
    }

    const sku = `LTS-${rawSku}`;
    const costPrice = Math.round(sellingPrice * 0.75);

    return {
      sku,
      name,
      costPrice,
      sellingPrice,
      imageUrl,
      categoryName,
    };
  } catch (err: any) {
    return null;
  }
}

export async function fetchLotusProductUrlsFromHomepage(): Promise<string[]> {
  console.log(
    "🌐 Fetching product links automatically from Lotus's homepage & top categories ...",
  );
  const discovered: string[] = [];

  const mainPages = [
    "https://www.lotuss.com/th",
    "https://www.lotuss.com/th/category/snack-and-instant-food-deal",
    "https://www.lotuss.com/th/category/milk-and-beverages-1",
    "https://www.lotuss.com/th/category/dried-food-and-ingredients-1",
    "https://www.lotuss.com/th/category/beauty-and-personal-care",
    "https://www.lotuss.com/th/category/household-and-merits",
    "https://www.lotuss.com/th/category/weekly-promotion",
    "https://www.lotuss.com/th/category/ONLINEBESTSELLER",
    "https://www.lotuss.com/th/category/fresh-food-and-bakery",
    "https://www.lotuss.com/th/category/MOMANDBABY",
    "https://www.lotuss.com/th/category/HEALTHANDWELLNESS",
  ];

  for (const pageUrl of mainPages) {
    try {
      await delay(100); // Anti-DDoS delay between category fetches
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "th-TH,th;q=0.9",
        },
      });
      if (!res.ok) continue;
      const html = await res.text();

      // 1. Direct href product links
      const directLinks = html.match(/\/th\/product\/[a-zA-Z0-9_-]+/g) || [];
      directLinks.forEach((l) => discovered.push(`https://www.lotuss.com${l}`));

      // 2. 8-digit product SKUs found in HTML
      const digitSkus = html.match(/\b\d{7,8}\b/g) || [];
      digitSkus.forEach((s) =>
        discovered.push(`https://www.lotuss.com/th/product/${s}`)
      );
    } catch (e) {
      // ignore single page failure
    }
  }

  const knownCandidates = [
    "https://www.lotuss.com/th/product/knorr-cup-jok-pork-35g-x-4-sachets-19661207?utm_track=cl%3A1",
    "https://www.lotuss.com/th/product/75703297",
    "https://www.lotuss.com/th/product/73845043",
    "https://www.lotuss.com/th/product/72648721",
    "https://www.lotuss.com/th/product/73891024",
  ];

  const allUrls = [...new Set([...knownCandidates, ...discovered])];
  console.log(
    `✨ Discovered ${allUrls.length} Lotus product URL candidates across categories.`,
  );
  return allUrls;
}

export async function seedLotusFromUrls(
  storeId: number,
  productUrls: string[],
  targetSuccessCount = 150,
  maxAttempts = 500,
  resetFirst = false,
) {
  // Ensure store categories exist (35 categories from categoryData)
  await seedCategories(storeId, false);

  if (resetFirst) {
    console.log(
      `🧹 Clearing existing products & stock movements for store ID: ${storeId}...`,
    );
    await prisma.product_stock_movements.deleteMany({
      where: { store_id: storeId },
    });
    const storeOrders = await prisma.orders.findMany({
      where: { store_id: storeId },
      select: { id: true },
    });
    const orderIds = storeOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await prisma.order_items.deleteMany({
        where: { order_id: { in: orderIds } },
      });
    }
    await prisma.products.deleteMany({ where: { store_id: storeId } });
  }

  const storeCategories = await prisma.categories.findMany({
    where: { store_id: storeId },
  });

  const storeLocations = await prisma.locations.findMany({
    where: { store_id: storeId },
    include: { products: true },
    orderBy: { id: "asc" },
  });

  const storeOwner = await prisma.store_members.findFirst({
    where: { store_id: storeId },
  });
  const userId = storeOwner?.user_id || 1;

  // Track location capacities in-memory
  const locationUsageMap = new Map<
    number,
    { maxCap: number; currentStock: number }
  >();
  for (const loc of storeLocations) {
    const stockSum = loc.products.reduce((acc, p) => acc + p.stock_on_hand, 0);
    locationUsageMap.set(loc.id, {
      maxCap: loc.max_capacity,
      currentStock: stockSum,
    });
  }

  const seededProducts = [];
  let attempt = 0;
  const limitAttempts = Math.min(maxAttempts, productUrls.length);

  console.log(
    `🎯 Goal: Seed ${targetSuccessCount} successful products mapped across ${storeCategories.length} categories (with anti-DDoS rate-limiting)...`,
  );

  while (
    seededProducts.length < targetSuccessCount && attempt < limitAttempts
  ) {
    const url = productUrls[attempt];
    attempt++;

    // Anti-DDoS rate-limiting delay (150ms)
    await delay(150);

    console.log(
      `🔍 Attempt ${attempt}/${limitAttempts} [Progress: ${seededProducts.length}/${targetSuccessCount}]: ${url}`,
    );

    const item = await fetchLotusProductInfo(url);
    if (!item) {
      console.warn(
        `  ❌ Skipped (invalid product or fetch failed - does NOT count towards total)`,
      );
      continue;
    }

    // Map product to one of the 35 store categories
    const categoryId = findMatchingCategoryId(
      item.categoryName,
      item.name,
      storeCategories,
    );
    const matchedCategoryName = storeCategories.find((c) =>
      c.id === categoryId
    )?.name || "ทั่วไป";

    // Check existing product to adjust tracked stock
    const existing = await prisma.products.findUnique({
      where: {
        store_id_sku: {
          store_id: storeId,
          sku: item.sku,
        },
      },
    });

    if (
      existing && existing.location_id &&
      locationUsageMap.has(existing.location_id)
    ) {
      const usage = locationUsageMap.get(existing.location_id)!;
      usage.currentStock = Math.max(
        0,
        usage.currentStock - existing.stock_on_hand,
      );
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
      targetLocationId = storeLocations[attempt % storeLocations.length].id;
      const usage = locationUsageMap.get(targetLocationId);
      availableCap = usage
        ? Math.max(0, usage.maxCap - usage.currentStock)
        : 20;
    }

    // Determine stock (10 to 30, divisible by 10, strictly <= availableCap)
    const desiredStock = 20;
    let allocatedStock = Math.min(desiredStock, availableCap);
    allocatedStock = Math.floor(allocatedStock / 10) * 10;
    if (allocatedStock <= 0 && availableCap >= 10) {
      allocatedStock = 10;
    }

    const reorderPoint = Math.max(5, Math.floor(allocatedStock * 0.2));

    console.log(
      `  -> 🎉 SUCCESS (${
        seededProducts.length + 1
      }/${targetSuccessCount}): "${item.name}"`,
    );
    console.log(
      `     Category: [${matchedCategoryName}] | SKU: ${item.sku} | Price: ${item.sellingPrice} THB`,
    );
    console.log(
      `     Allocated Stock: ${allocatedStock} in Location ID: ${targetLocationId}`,
    );

    // Update tracked capacity
    if (targetLocationId && locationUsageMap.has(targetLocationId)) {
      const usage = locationUsageMap.get(targetLocationId)!;
      usage.currentStock += allocatedStock;
    }

    let imageId: number | null = null;
    if (item.imageUrl) {
      const img = await prisma.images.create({
        data: { url: item.imageUrl },
      });
      imageId = img.id;
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
          stock_on_hand: allocatedStock,
          reorder_point: reorderPoint,
          image_id: imageId,
        },
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
          stock_on_hand: allocatedStock,
          reorder_point: reorderPoint,
          image_id: imageId,
        },
      });

      await prisma.product_stock_movements.create({
        data: {
          store_id: storeId,
          product_id: product.id,
          delta: allocatedStock,
          reason: `นำเข้าสินค้า Lotus's หมวดหมู่ [${matchedCategoryName}]`,
          created_by: userId,
        },
      });
    }

    seededProducts.push(product);
  }

  return seededProducts;
}

async function main() {
  console.log(
    "🛒 --- Lotus's Thailand Category-Mapped Product Seeder (50 Items Target) ---",
  );

  const availableStores = await prisma.stores.findMany({
    select: { id: true, name: true, slug: true },
  });

  if (availableStores.length === 0) {
    console.error(
      "❌ No stores found in database. Please run main seed first (bun run seed).",
    );
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  try {
    console.log("\nAvailable stores in database:");
    availableStores.forEach((s) =>
      console.log(`  - [ID: ${s.id}] ${s.name} (slug: ${s.slug})`)
    );

    const defaultSlug = availableStores[0].slug;
    const storeInput = await rl.question(
      `\n📌 Enter Store Slug or Store ID (default: ${defaultSlug}): `,
    );
    const targetQuery = storeInput.trim() || defaultSlug;

    let store = availableStores.find(
      (s) =>
        s.slug.toLowerCase() === targetQuery.toLowerCase() ||
        String(s.id) === targetQuery,
    );

    if (!store) {
      const storeIdNum = Number.parseInt(targetQuery, 10);
      if (!Number.isNaN(storeIdNum)) {
        const found = await prisma.stores.findUnique({
          where: { id: storeIdNum },
        });
        if (found) store = { id: found.id, name: found.name, slug: found.slug };
      } else {
        const found = await prisma.stores.findUnique({
          where: { slug: targetQuery },
        });
        if (found) store = { id: found.id, name: found.name, slug: found.slug };
      }
    }

    if (!store) {
      console.error(`❌ Store "${targetQuery}" not found.`);
      process.exit(1);
    }

    console.log(
      `\n🎯 Selected Store: ${store.name} (ID: ${store.id}, Slug: ${store.slug})`,
    );

    const customUrlInput = await rl.question(
      "\n🔗 Enter Lotus Product URL (or press Enter to auto-discover across 35 categories): ",
    );
    let productUrls: string[] = [];
    let isSingleCustom = false;

    if (customUrlInput.trim()) {
      productUrls = [customUrlInput.trim()];
      isSingleCustom = true;
    } else {
      productUrls = await fetchLotusProductUrlsFromHomepage();
    }

    const resetAnswer = await rl.question(
      "\n❓ Reset existing products for this store first? (y/N): ",
    );
    const resetFirst = resetAnswer.trim().toLowerCase() === "y" ||
      resetAnswer.trim().toLowerCase() === "yes";

    console.log(
      `\n⏳ Fetching Lotus products & seeding to store (resetFirst: ${resetFirst})...`,
    );

    const targetCount = isSingleCustom ? 1 : 150;
    const maxAttempts = isSingleCustom ? 1 : 500;

    const result = await seedLotusFromUrls(
      store.id,
      productUrls,
      targetCount,
      maxAttempts,
      resetFirst,
    );

    console.log(
      `\n✅ Successfully seeded ${result.length} Lotus products mapped across 35 categories for store "${store.name}"!`,
    );
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
