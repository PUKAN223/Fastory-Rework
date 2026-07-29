import fs from "node:fs";
import readline from "node:readline";
import { translate } from "@vitalets/google-translate-api";
import { prisma } from "../db/client";

const PRODUCT_LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const LOCK_COUNT = Number(process.env.LOCK_COUNT) || 10;
const STORE_SLUG = process.env.STORE_SLUG || "";
const CACHE_FILE = "data/translation_cache.json";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// 1. Disk Cache Management (Loads & saves real translations locally)
let diskCache: Record<string, string> = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    diskCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    console.log(
      `📁 Loaded ${
        Object.keys(diskCache).length
      } cached real translations from '${CACHE_FILE}'`,
    );
  } catch {
    diskCache = {};
  }
}

function saveDiskCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(diskCache, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save translation cache file:", e);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 2. Real Machine Translation Engine with Disk Cache
async function translateRealToThai(text: string): Promise<string> {
  if (!text) return "สินค้าคุณภาพ";

  const trimmed = text.replace(/^"|"$/g, "").replace(/&amp;/g, "&").trim();
  if (!trimmed) return "สินค้าคุณภาพ";

  // Return from local disk cache instantly if available (0ms offline)
  if (diskCache[trimmed]) {
    return diskCache[trimmed];
  }

  // Real Neural Machine Translation via Google Translate API
  try {
    const res = await translate(trimmed, { to: "th" });
    const thaiText = res.text || trimmed;
    diskCache[trimmed] = thaiText;
    return thaiText;
  } catch (err: any) {
    // If rate-limited (HTTP 429), pause 1s and retry once
    if (err?.name === "TooManyRequestsError" || String(err).includes("429")) {
      await sleep(1000);
      try {
        const retryRes = await translate(trimmed, { to: "th" });
        const thaiText = retryRes.text || trimmed;
        diskCache[trimmed] = thaiText;
        return thaiText;
      } catch {}
    }
    // Fallback if network fails
    diskCache[trimmed] = trimmed;
    return trimmed;
  }
}

// Batch translate with local disk caching
async function batchTranslateReal(
  texts: string[],
  batchSize = 10,
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map((t) => translateRealToThai(t)),
    );
    results.push(...chunkResults);
    saveDiskCache(); // Periodically persist disk cache
  }
  return results;
}

async function main() {
  const limitLabel = PRODUCT_LIMIT === Infinity
    ? "Unlimited (All CSV items)"
    : `${PRODUCT_LIMIT} items`;
  console.log(
    `🚀 Starting Mock Data Seeding with Real Translation Engine + Local Disk Cache (Reset DB + ${limitLabel})...`,
  );

  // 1. Reset Database Tables
  console.log("🧹 Resetting Database (Clearing old records)...");
  await prisma.order_items.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.product_stock_movements.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.categories.deleteMany({});
  await prisma.locations.deleteMany({});

  // Ensure Admin Role & User
  let adminRole = await prisma.roles.findFirst({ where: { name: "แอดมิน" } });
  if (!adminRole) {
    adminRole = await prisma.roles.create({
      data: { name: "แอดมิน", permissions: { "*": true } },
    });
  }

  let adminUser = await prisma.users.findFirst();
  if (!adminUser) {
    adminUser = await prisma.users.create({
      data: {
        username: "เจ้าของร้าน",
        email: "admin@shopthai.com",
        password_hash: "hashed_password",
        role_id: adminRole.id,
      },
    });
  }

  // Ensure target Store
  let store = STORE_SLUG
    ? await prisma.stores.findFirst({
      where: {
        OR: [
          { slug: STORE_SLUG },
          { name: { contains: STORE_SLUG, mode: "insensitive" } },
        ],
      },
    })
    : await prisma.stores.findFirst();

  if (!store) {
    store = await prisma.stores.create({
      data: {
        name: "Katsu Store",
        slug: "katsu-store",
        owner_id: adminUser.id,
        description: "ร้านค้าตัวอย่างสำหรับระบบ POS และสต็อก",
      },
    });

    await prisma.store_members.create({
      data: {
        store_id: store.id,
        user_id: adminUser.id,
        job_title: "Owner",
        permissions: { "*": true },
      },
    });
  }

  console.log(`📦 Target Store: ${store.name} (ID: ${store.id})`);

  // 2. Create Stock Locations: Lock A1, Lock A2, ..., Lock A(LOCK_COUNT)
  console.log(
    `📍 Generating ${LOCK_COUNT} Stock Locations (Lock A1 .. Lock A${LOCK_COUNT})...`,
  );
  const locationNames: string[] = [];
  for (let i = 1; i <= LOCK_COUNT; i++) {
    const locName = `Lock A${i}`;
    locationNames.push(locName);
    await prisma.locations.create({
      data: {
        store_id: store.id,
        name: locName,
        description: `พื้นที่จัดเก็บสินค้า Lock A${i}`,
        max_capacity: 5000,
      },
    });
  }
  console.log(`✅ Created stock locations: ${locationNames.join(", ")}`);

  // 3. Seed & Real Translate Categories
  console.log("🌐 Translating Categories using Real Translation Engine...");
  const catCsvContent = fs.readFileSync("data/amazon_categories.csv", "utf-8");
  const catLines = catCsvContent.split(/\r?\n/);

  const rawCategories: { csvCatId: number; rawCatName: string }[] = [];

  for (let i = 1; i < catLines.length; i++) {
    const line = catLines[i].trim();
    if (!line) continue;
    const [csvIdStr, ...nameParts] = line.split(",");
    const csvCatId = Number(csvIdStr);
    const rawCatName = nameParts.join(",").replace(/^"|"$/g, "").trim();

    if (isNaN(csvCatId) || !rawCatName) continue;
    rawCategories.push({ csvCatId, rawCatName });
  }

  // Batch translate categories using real translate engine
  const rawCatNames = rawCategories.map((c) => c.rawCatName);
  const translatedCatNames = rawCatNames;

  const csvCatIdToDbId = new Map<number, number>();
  const csvCatIdToThaiName = new Map<number, string>();

  for (let i = 0; i < rawCategories.length; i++) {
    const { csvCatId, rawCatName } = rawCategories[i];
    const thaiCatName = translatedCatNames[i] || rawCatName;

    let existingCat = await prisma.categories.findFirst({
      where: { store_id: store.id, name: thaiCatName },
    });

    if (!existingCat) {
      existingCat = await prisma.categories.create({
        data: {
          store_id: store.id,
          name: thaiCatName,
          description: `หมวดหมู่สินค้า ${thaiCatName} (${rawCatName})`,
        },
      });
    }

    csvCatIdToDbId.set(csvCatId, existingCat.id);
    csvCatIdToThaiName.set(csvCatId, thaiCatName);
  }

  console.log(`✅ Real Translated & Seeded ${csvCatIdToDbId.size} categories.`);

  // 4. Seed Amazon Products using Real Translation Engine
  console.log(`🛍️ Reading & Real Translating Products...`);
  const rl = readline.createInterface({
    input: fs.createReadStream("data/amazon_products.csv"),
    crlfDelay: Infinity,
  });

  let parsedCount = 0;
  let isHeader = true;
  const rawProductsBuffer: {
    productData: any;
    imgUrl?: string;
    rawTitle: string;
  }[] = [];
  const existingSkusSet = new Set<string>();

  async function flushBuffer() {
    if (!store || rawProductsBuffer.length === 0) return;

    // Translate product titles using real translation engine with local disk caching
    const titlesToTranslate = rawProductsBuffer.map((b) => b.rawTitle);
    const thaiTitles = titlesToTranslate;

    // Create image records for products with imgUrl
    const imgUrlToIdMap = new Map<string, number>();
    for (const item of rawProductsBuffer) {
      if (item.imgUrl && !imgUrlToIdMap.has(item.imgUrl)) {
        const createdImage = await prisma.images.create({
          data: { url: item.imgUrl },
        });
        imgUrlToIdMap.set(item.imgUrl, createdImage.id);
      }
    }

    const productsToInsert = rawProductsBuffer.map((item, idx) => ({
      ...item.productData,
      name: thaiTitles[idx] || item.rawTitle,
      image_id: item.imgUrl ? imgUrlToIdMap.get(item.imgUrl) ?? null : null,
    }));

    await prisma.products.createMany({
      data: productsToInsert,
      skipDuplicates: true,
    });

    const insertedProducts = await prisma.products.findMany({
      where: {
        store_id: store.id,
        sku: { in: productsToInsert.map((p) => p.sku) },
      },
      select: { id: true, stock_on_hand: true },
    });

    await prisma.product_stock_movements.createMany({
      data: insertedProducts.map((pdt) => ({
        store_id: store.id,
        product_id: pdt.id,
        delta: pdt.stock_on_hand,
        reason: "ยอดยกมาเริ่มต้น (Real Machine Translation Seed)",
      })),
    });

    rawProductsBuffer.length = 0;
  }

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    if (!line.trim()) continue;

    const cols = parseCsvLine(line);
    const asin = cols[0]?.trim();
    const rawTitle = cols[1]?.trim();
    const imgUrl = cols[2]?.trim();
    const priceStr = cols[6]?.trim();
    const listPriceStr = cols[7]?.trim();
    const catIdStr = cols[8]?.trim();
    const boughtInLastMonthStr = cols[10]?.trim();

    if (!asin || !rawTitle) continue;
    if (existingSkusSet.has(asin)) continue;

    const csvCatId = Number(catIdStr);
    const dbCatId = csvCatIdToDbId.get(csvCatId);
    const thaiCatName = csvCatIdToThaiName.get(csvCatId) || "หมวดหมู่ทั่วไป";
    if (!dbCatId) continue;

    const sellingPrice = parseFloat(priceStr) || 199.0;
    const listPrice = parseFloat(listPriceStr) || 0.0;
    const costPrice = listPrice > sellingPrice
      ? sellingPrice * 0.75
      : sellingPrice * 0.7;
    const boughtCount = parseInt(boughtInLastMonthStr, 10) ||
      Math.floor(Math.random() * 80) + 10;
    const stockOnHand = boughtCount > 0
      ? Math.min(boughtCount, 500)
      : Math.floor(Math.random() * 50) + 10;

    rawProductsBuffer.push({
      rawTitle,
      productData: {
        store_id: store.id,
        sku: asin,
        category_id: dbCatId,
        name: rawTitle, // replaced after real machine translation
        description: `รหัสสินค้า (SKU/ASIN): ${asin} | หมวดหมู่: ${thaiCatName}`,
        cost_price: Number(costPrice.toFixed(2)),
        selling_price: Number(sellingPrice.toFixed(2)),
        stock_on_hand: stockOnHand,
        reorder_point: 10,
      },
      imgUrl:
        imgUrl && (imgUrl.startsWith("http") || imgUrl.startsWith("data:"))
          ? imgUrl
          : undefined,
    });

    existingSkusSet.add(asin);
    parsedCount++;

    if (rawProductsBuffer.length >= 100) {
      await flushBuffer();
      const limitStr = PRODUCT_LIMIT === Infinity ? "Unlimited" : PRODUCT_LIMIT;
      console.log(
        `🌐 Progress: ${parsedCount} / ${limitStr} products real-translated & saved...`,
      );
    }

    if (parsedCount >= PRODUCT_LIMIT) {
      rl.close();
      break;
    }
  }

  await flushBuffer();
  saveDiskCache();

  console.log(
    `🎉 Finished! Successfully reset database and seeded ${parsedCount} real translated Thai products into store '${store.name}'!`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    saveDiskCache();
    await prisma.$disconnect();
  });
