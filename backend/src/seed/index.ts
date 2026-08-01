import { prisma } from "../db/client"
import { seedCategories } from "./categories"

const p = prisma;

async function main() {
  console.log("🧹 Resetting Database...");
  await p.order_items.deleteMany({});
  await p.orders.deleteMany({});
  await p.product_stock_movements.deleteMany({});
  await p.products.deleteMany({});
  await p.categories.deleteMany({});
  await p.locations.deleteMany({});

  const adminRole = await p.roles.upsert({
    where: { name: "แอดมิน" },
    update: { permissions: { "*": true } },
    create: {
      name: "แอดมิน",
      permissions: { "*": true }
    }
  })

  const staffRole = await p.roles.upsert({
    where: { name: "พนักงาน" },
    update: {
      permissions: {
        "products:read": true,
        "categories:read": true,
        "locations:read": true,
        "pos:write": true,
      }
    },
    create: {
      name: "พนักงาน",
      permissions: {
        "products:read": true,
        "categories:read": true,
        "locations:read": true,
        "pos:write": true,
      }
    }
  })

  const ownerRole = await p.roles.upsert({
    where: { name: "Owner" },
    update: { permissions: { "*": true } },
    create: { name: "Owner", permissions: { "*": true } }
  })

  await p.roles.upsert({
    where: { name: "User" },
    update: {},
    create: { name: "User", permissions: {} }
  })

  const img1 = await p.images.create({
    data: { url: "https://picsum.photos/200?thai1" }
  })

  const img2 = await p.images.create({
    data: { url: "https://picsum.photos/200?thai2" }
  })

  const img3 = await p.images.create({
    data: { url: "https://picsum.photos/200?thai3" }
  })

  const admin = await p.users.upsert({
    where: { email: "admin@shopthai.com" },
    update: { role_id: adminRole.id },
    create: {
      username: "เจ้าของร้าน",
      email: "admin@shopthai.com",
      password_hash: "hashed_password",
      role_id: adminRole.id,
      profile_image_id: img1.id
    }
  })

  const staff = await p.users.upsert({
    where: { email: "staff@shopthai.com" },
    update: { role_id: staffRole.id },
    create: {
      username: "พนักงานหน้าร้าน",
      email: "staff@shopthai.com",
      password_hash: "hashed_password",
      role_id: staffRole.id,
      profile_image_id: img2.id
    }
  })

  const store = await p.stores.upsert({
    where: { slug: "katsu-store" },
    update: { owner_id: admin.id },
    create: {
      name: "Katsu Store",
      slug: "katsu-store",
      description: "ร้านค้าตัวอย่างสำหรับระบบ POS และสต็อก",
      owner_id: admin.id,
    }
  })

  await p.store_members.upsert({
    where: { store_id_user_id: { store_id: store.id, user_id: admin.id } },
    update: { job_title: "Owner", permissions: { "*": true } },
    create: { store_id: store.id, user_id: admin.id, job_title: "Owner", permissions: { "*": true } }
  })

  await p.store_members.upsert({
    where: { store_id_user_id: { store_id: store.id, user_id: staff.id } },
    update: { job_title: "Staff", permissions: { "pos:access": true } },
    create: { store_id: store.id, user_id: staff.id, job_title: "Staff", permissions: { "pos:access": true } }
  })

  // Seed categories using dedicated module
  const createdCategories = await seedCategories(store.id);

  const catMap = new Map(createdCategories.map(c => [c.name, c.id]));
  const defaultCatId = createdCategories[0].id;
  const snackCatId = catMap.get("โปรขนม อาหาร") || defaultCatId;
  const drinkCatId = catMap.get("น้ำ เครื่องดื่มและผงชงดื่ม") || defaultCatId;
  const homeCatId = catMap.get("ของใช้ในบ้าน") || defaultCatId;

  const products = await Promise.all([
    p.products.create({
      data: {
        store_id: store.id,
        sku: "TH-KEY-001",
        name: "คีย์บอร์ดเกมมิ่ง RGB",
        category_id: catMap.get("อุปกรณ์อิเล็กทรอนิกส์") || defaultCatId,
        cost_price: 450,
        selling_price: 890,
        image_id: img1.id,
        stock_on_hand: 15
      }
    }),
    p.products.create({
      data: {
        store_id: store.id,
        sku: "TH-MOU-002",
        name: "เมาส์เกมมิ่ง DPI สูง",
        category_id: catMap.get("อุปกรณ์อิเล็กทรอนิกส์") || defaultCatId,
        cost_price: 200,
        selling_price: 490,
        image_id: img2.id,
        stock_on_hand: 25
      }
    }),
    p.products.create({
      data: {
        store_id: store.id,
        sku: "TH-FOOD-003",
        name: "มาม่ารสต้มยำกุ้ง",
        category_id: snackCatId,
        cost_price: 6,
        selling_price: 10,
        image_id: img3.id,
        stock_on_hand: 200
      }
    }),
    p.products.create({
      data: {
        store_id: store.id,
        sku: "TH-DRINK-004",
        name: "โค้กกระป๋อง",
        category_id: drinkCatId,
        cost_price: 12,
        selling_price: 20,
        image_id: img2.id,
        stock_on_hand: 120
      }
    }),
    p.products.create({
      data: {
        store_id: store.id,
        sku: "TH-HOME-005",
        name: "ทิชชู่แพ็ค 6 ม้วน",
        category_id: homeCatId,
        cost_price: 40,
        selling_price: 79,
        image_id: img1.id,
        stock_on_hand: 60
      }
    })
  ])

  await p.product_stock_movements.createMany({
    data: products.map(pdt => ({
      store_id: store.id,
      product_id: pdt.id,
      delta: pdt.stock_on_hand,
      reason: "เพิ่มสต็อกเริ่มต้น",
      created_by: admin.id
    }))
  })

  console.log(`✅ Main seed completed with ${createdCategories.length} categories!`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await p.$disconnect()
  })
