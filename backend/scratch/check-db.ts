import { prisma } from "../src/db/client";

async function main() {
  const roles = await prisma.roles.findMany();
  console.log("ROLES IN DB:", JSON.stringify(roles, null, 2));

  const users = await prisma.users.findMany({
    include: { roles: true }
  });
  console.log("USERS IN DB:", JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
