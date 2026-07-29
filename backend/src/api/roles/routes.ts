import z from "zod";
import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { requirePermission } from "../auth/permissions";

class RolesRoutes extends BaseRouter {
  public getRouter() {
    const permSchema = z.record(z.string(), z.boolean()); // JSON object

    const router = super.getRouter();

    router.guard({ beforeHandle: requirePermission("roles:read") }, (app) =>
      app
        .get("/", async () => {
          const roles = await prisma.roles.findMany();
          return { success: true, roles };
        })

        .get("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid role ID" };
          }

          const role = await prisma.roles.findUnique({ where: { id } });
          if (!role) {
            req.set.status = 404;
            return { success: false, message: "Role not found" };
          }

          return { success: true, role };
        })
    );

    router.guard({ beforeHandle: requirePermission("roles:write") }, (app) =>
      app
        .post("/", async (req) => {
          const schema = z.object({
            name: z.string().min(1),
            permissions: permSchema.optional(),
          });

          const r = schema.safeParse(req.body);
          if (!r.success) {
            req.set.status = 400;
            return { success: false, message: "Invalid request body", errors: r.error.flatten().fieldErrors };
          }

          const role = await prisma.roles.create({
            data: {
              name: r.data.name,
              permissions: r.data.permissions ?? {},
            },
          });

          return { success: true, role };
        })

        .patch("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid role ID" };
          }

          const schema = z.object({
            name: z.string().min(1).optional(),
            permissions: permSchema.optional(),
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
          if (r.data.name !== undefined) data.name = r.data.name;
          if (r.data.permissions !== undefined) data.permissions = r.data.permissions;

          try {
            const role = await prisma.roles.update({ where: { id }, data });
            return { success: true, role };
          } catch {
            req.set.status = 404;
            return { success: false, message: "Role not found" };
          }
        })

        .delete("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid role ID" };
          }

          try {
            await prisma.roles.delete({ where: { id } });
            return { success: true, message: "Role deleted successfully" };
          } catch {
            req.set.status = 404;
            return { success: false, message: "Role not found" };
          }
        })
    );

    return router;
  }
}

export { RolesRoutes };
