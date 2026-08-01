import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { prisma } from "../db/client";

const capacities = [100, 110, 120, 130, 140, 150, 100, 110, 120, 130];

export const defaultLocations = Array.from({ length: 10 }, (_, i) => {
  const index = i + 1;
  return {
    name: `ที่เก็บสินค้า ${index}`,
    description: `คลังสินค้า / จุดจัดเก็บสินค้า โซนที่ ${index}`,
    max_capacity: capacities[i],
  };
});

export async function seedLocations(storeId: number, resetFirst = false) {
  if (resetFirst) {
    console.log(`🧹 Clearing existing locations for store ID: ${storeId}...`);
    await prisma.locations.deleteMany({
      where: { store_id: storeId }
    });
  }

  const locations = [];
  for (const loc of defaultLocations) {
    const existing = await prisma.locations.findFirst({
      where: {
        store_id: storeId,
        name: loc.name
      }
    });

    if (existing) {
      const updated = await prisma.locations.update({
        where: { id: existing.id },
        data: {
          description: loc.description,
          max_capacity: loc.max_capacity
        }
      });
      locations.push(updated);
    } else {
      const created = await prisma.locations.create({
        data: {
          store_id: storeId,
          name: loc.name,
          description: loc.description,
          max_capacity: loc.max_capacity
        }
      });
      locations.push(created);
    }
  }
  return locations;
}

async function main() {
  console.log("🌱 --- Locations Seeder (ที่เก็บสินค้า 1-10) ---");

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

    const resetAnswer = await rl.question("❓ Reset (delete all existing) locations for this store first? (y/N): ");
    const resetFirst = resetAnswer.trim().toLowerCase() === "y" || resetAnswer.trim().toLowerCase() === "yes";

    console.log(`\n⏳ Seeding 10 locations (resetFirst: ${resetFirst})...`);
    const result = await seedLocations(store.id, resetFirst);

    console.log(`\n✅ Successfully seeded ${result.length} locations (ที่เก็บสินค้า 1-10) for store "${store.name}"!`);
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
