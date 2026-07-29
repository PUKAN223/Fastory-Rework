import Fastory from "../src/class/Fastory";
import { authSessionStore } from "../src/api/auth/sessionStore";
import { prisma } from "../src/db/client";

async function main() {
  // 1. Get user 1
  const user = await prisma.users.findUnique({
    where: { id: 1 },
    include: { roles: true }
  });

  if (!user) {
    console.error("User 1 not found");
    return;
  }

  // 2. Create mock session
  const session = authSessionStore.create({
    id: user.id,
    username: user.username,
    email: user.email,
    profile_picture_url: null,
    role: { id: user.roles.id, name: user.roles.name, permissions: (user.roles.permissions || {}) as Record<string, boolean> },
    storeMemberships: []
  });

  console.log("Mock access token:", session.accessToken);

  // 3. Instantiate Elysia app
  const fastory = new Fastory();
  const app = (fastory as any).app;

  // 4. Send mock PATCH request
  const req = new Request("http://localhost:8080/api/v1/stores/1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.accessToken}`
    },
    body: JSON.stringify({
      name: "Katsu Renamed",
      slug: "katsu-renamed",
      description: "Edited store info"
    })
  });

  const res = await app.handle(req);
  console.log("Response status:", res.status);
  console.log("Response body:", await res.json().catch(() => "Non-JSON"));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
