import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requirePermission } from "../auth/permissions";

class UsersRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requirePermission("users:read") }, (app) =>
      app
        .get("/", async () => {
          const users = await prisma.users.findMany();
          return { success: true, users };
        })

        .get("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid user ID" };
          }

          const user = await prisma.users.findUnique({ where: { id } });
          if (!user) {
            req.set.status = 404;
            return { success: false, message: "User not found" };
          }

          return { success: true, user };
        })
    );

    router.guard({ beforeHandle: requirePermission("users:write") }, (app) =>
      app
        .post("/", async (req) => {
          const schema = z.object({
            username: z.string().min(1),
            password_hash: z.string().min(1),
            role_id: z.number().int(),
            profile_image_id: z.number().int().nullable().optional(),
          });

          const r = schema.safeParse(req.body);
          if (!r.success) {
            req.set.status = 400;
            return { success: false, message: "Invalid request body", errors: r.error.flatten().fieldErrors };
          }

          const user = await prisma.users.create({
            data: {
              username: r.data.username,
              email: (r.data as any).email || `${r.data.username}@fastory.local`,
              password_hash: r.data.password_hash,
              role_id: r.data.role_id,
              profile_image_id: r.data.profile_image_id ?? undefined,
            },
          });

          return { success: true, user };
        })

        .patch("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid user ID" };
          }

          const schema = z.object({
            username: z.string().min(1).optional(),
            password_hash: z.string().min(1).optional(),
            role_id: z.number().int().optional(),
            profile_image_id: z.number().int().nullable().optional(),
          });

          const r = schema.safeParse(req.body);
          if (!r.success) {
            req.set.status = 400;
            return { success: false, message: "Invalid request body", errors: r.error.flatten().fieldErrors };
          }

          if (Object.keys(r.data).length === 0) {
            req.set.status = 400;
            return { success: false, message: "No fields to update" };
          }

          const data: any = {};
          if (r.data.username !== undefined) data.username = r.data.username;
          if (r.data.password_hash !== undefined) data.password_hash = r.data.password_hash;
          if (r.data.role_id !== undefined) data.role_id = r.data.role_id;
          if (r.data.profile_image_id !== undefined) data.profile_image_id = r.data.profile_image_id;

          try {
            const user = await prisma.users.update({ where: { id }, data });
            return { success: true, user };
          } catch {
            req.set.status = 404;
            return { success: false, message: "User not found" };
          }
        })

        .delete("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid user ID" };
          }

          try {
            await prisma.users.delete({ where: { id } });
            return { success: true, message: "User deleted successfully" };
          } catch {
            req.set.status = 404;
            return { success: false, message: "User not found" };
          }
        })
    );

    return router;
  }
}

export { UsersRoutes };
