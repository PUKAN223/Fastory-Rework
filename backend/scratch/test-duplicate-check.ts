import { prisma } from "../src/db/client";

async function main() {
  // 1. Clear existing stores for a clean test
  await prisma.stores.deleteMany({});
  console.log("Cleared stores");

  // 2. Create store
  const store = await prisma.stores.create({
    data: {
      name: "Test Store",
      slug: "test-store",
      owner_id: 1,
      icon: "store"
    }
  });
  console.log("Created store:", store);

  // 3. Update store with same name and slug
  try {
    const updatedStore = await prisma.stores.update({
      where: { id: store.id },
      data: {
        name: "Test Store",
        slug: "test-store",
        icon: "coffee"
      }
    });
    console.log("Updated store successfully:", updatedStore);
  } catch (error: any) {
    console.error("UPDATE ERROR:", error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
