import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../db/client";

export const categoryData = [
  { name: "โปรขนม อาหาร", description: "โปรโมชั่นพิเศษสำหรับขนมและอาหาร" },
  { name: "สุขภาพดีกับ LOTUS'S", description: "สินค้าเพื่อสุขภาพและการดูแลตนเอง" },
  { name: "ตัวดังออนไลน์", description: "สินค้าบิวตี้และของใช้ยอดฮิตติดเทรนด์ออนไลน์" },
  { name: "เนื้อสัตว์", description: "เนื้อหมู เนื้อไก่ เนื้อวัว และเนื้อสัตว์สดคุณภาพดี" },
  { name: "โปรเด็ดประจำสัปดาห์", description: "สินค้าราคาพิเศษประจำสัปดาห์" },
  { name: "ผักและผลไม้", description: "ผักสดและผลไม้สดคุณภาพดี" },
  { name: "สินค้าแจกแสตมป์กล้วย", description: "สินค้าโปรโมชั่นสะสมแสตมป์" },
  { name: "อาหารแห้งและเครื่องปรุง", description: "ข้าวสาร อาหารแห้ง น้ำมัน และเครื่องปรุงรสต่างๆ" },
  { name: "เทศกาลซีฟู้ด", description: "อาหารทะเลสดและแช่แข็งคุณภาพดี" },
  { name: "น้ำ เครื่องดื่มและผงชงดื่ม", description: "น้ำดื่ม ชา กาแฟ นม และเครื่องดื่มต่างๆ" },
  { name: "ความงามและของใช้ส่วนตัว", description: "ผลิตภัณฑ์ดูแลผิวพรรณ เส้นผม และของใช้ส่วนตัว" },
  { name: "นมสด และ นมยูเอชที", description: "นมสด นม UHT และนมพาสเจอร์ไรส์" },
  { name: "อาหารพร้อมทาน", description: "อาหารสำเร็จรูปพร้อมรับประทาน" },
  { name: "เบเกอรี่", description: "ขนมปัง เค้ก และเบเกอรี่อบใหม่" },
  { name: "อาหารพร้อมปรุง", description: "วัตถุดิบและชุดอาหารพร้อมสำหรับนำไปปรุง" },
  { name: "ไข่ ชีส เนยและโยเกิร์ต", description: "ไข่สด ผลิตภัณฑ์นม เนย ชีส และโยเกิร์ต" },
  { name: "ขนมและของหวาน", description: "ขนมขบเคี้ยว ช็อกโกแลต ขนมไทย และของหวาน" },
  { name: "ห้องครัว", description: "อุปกรณ์และเครื่องใช้ในห้องครัว" },
  { name: "ซีพี", description: "ผลิตภัณฑ์อาหารคุณภาพจากแบรนด์ CP" },
  { name: "สินค้าแบรนด์ โลตัส", description: "สินค้าคุณภาพราคาคุ้มค่าภายใต้แบรนด์โลตัส" },
  { name: "อุปกรณ์อิเล็กทรอนิกส์", description: "อุปกรณ์ไอที แกดเจ็ต และอุปกรณ์เสริมอิเล็กทรอนิกส์" },
  { name: "บ้านและของตกแต่ง", description: "เฟอร์นิเจอร์และของตกแต่งบ้าน" },
  { name: "อุปกรณ์รถยนต์", description: "ผลิตภัณฑ์ดูแลรักษาและอุปกรณ์เสริมสำหรับรถยนต์" },
  { name: "ทีวีและเครื่องใช้ไฟฟ้าในบ้าน", description: "เครื่องใช้ไฟฟ้า เครื่องใช้ในบ้าน และทีวี" },
  { name: "เพิ่มกำไรให้ผู้ประกอบการ", description: "สินค้าแพ็กใหญ่สำหรับร้านค้าและผู้ประกอบการ" },
  { name: "อาหารสัตว์", description: "อาหารและของใช้สำหรับสัตว์เลี้ยง" },
  { name: "ผลิตภัณฑ์ทำความสะอาด", description: "น้ำยาทำความสะอาด อุปกรณ์ทำความสะอาด และของใช้ในบ้าน" },
  { name: "สินค้าสำหรับแม่และเด็ก", description: "นมผง ผ้าอ้อม และของใช้สำหรับทารกและเด็ก" },
  { name: "ผลิตภัณฑ์ดูแลผู้สูงอายุ", description: "ผ้าอ้อมผู้ใหญ่และผลิตภัณฑ์ดูแลผู้สูงอายุ" },
  { name: "ร้านขายยาโลตัส", description: "เวชภัณฑ์ ยา และผลิตภัณฑ์ดูแลสุขภาพ" },
  { name: "เสื้อผ้าและเครื่องแต่งกาย", description: "เสื้อผ้า เครื่องแต่งกาย และแฟชั่น" },
  { name: "เครื่องเขียน", description: "อุปกรณ์เครื่องเขียน อุปกรณ์สำนักงาน และหนังสือ" },
  { name: "ไลฟ์สไตล์", description: "สินค้าไลฟ์สไตล์ กีฬา และการเดินทาง" },
  { name: "สินค้า SME", description: "สินค้าจากผู้ประกอบการขนาดกลางและขนาดย่อม (SME)" },
  { name: "ของใช้ในบ้าน", description: "ของใช้ทั่วไปภายในบ้าน" }
];

export async function seedCategories(storeId: number, resetFirst = false) {
  if (resetFirst) {
    console.log(`🧹 Clearing existing categories for store ID: ${storeId}...`);
    // Delete categories associated with this store
    await prisma.categories.deleteMany({
      where: { store_id: storeId }
    });
  }

  const categories = [];
  for (const cat of categoryData) {
    const existing = await prisma.categories.findFirst({
      where: {
        store_id: storeId,
        name: cat.name
      }
    });

    if (existing) {
      const updated = await prisma.categories.update({
        where: { id: existing.id },
        data: { description: cat.description }
      });
      categories.push(updated);
    } else {
      const created = await prisma.categories.create({
        data: {
          store_id: storeId,
          name: cat.name,
          description: cat.description
        }
      });
      categories.push(created);
    }
  }
  return categories;
}

async function main() {
  console.log("🌱 --- Categories Seeder ---");

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

    const resetAnswer = await rl.question("❓ Reset (delete all existing) categories for this store first? (y/N): ");
    const resetFirst = resetAnswer.trim().toLowerCase() === "y" || resetAnswer.trim().toLowerCase() === "yes";

    console.log(`\n⏳ Seeding categories (resetFirst: ${resetFirst})...`);
    const result = await seedCategories(store.id, resetFirst);

    console.log(`\n✅ Successfully seeded ${result.length} categories for store "${store.name}"!`);
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
