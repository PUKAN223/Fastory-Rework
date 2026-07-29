import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission } from "../auth/permissions";

class LocationsRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission("locations:read") }, (app) =>
      app
        .get("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const locations = await prisma.locations.findMany({ where: { store_id: storeId } });
          return { success: true, locations };
        })

        .get("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid location ID" };
          }

          const location = await prisma.locations.findFirst({ where: { id, store_id: storeId } });
          if (!location) {
            req.set.status = 404;
            return { success: false, message: "Location not found" };
          }

          return { success: true, location };
        })
    );

    router.guard({ beforeHandle: requireStorePermission("locations:write") }, (app) =>
      app
        .post("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const schema = z.object({
            name: z.string().min(1),
            max_capacity: z.number().int().min(0),
            description: z.string().optional(),
          });

          const r = schema.safeParse(req.body);
          if (!r.success) {
            req.set.status = 400;
            return { success: false, message: "Invalid request body", errors: r.error.flatten().fieldErrors };
          }

          const location = await prisma.locations.create({
            data: {
              store_id: storeId,
              name: r.data.name,
              max_capacity: r.data.max_capacity,
              description: r.data.description,
            },
          });

          return { success: true, location };
        })

        .patch("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid location ID" };
          }

          const schema = z.object({
            name: z.string().min(1).optional(),
            max_capacity: z.number().int().min(0).optional(),
            description: z.string().optional(),
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

          const existing = await prisma.locations.findFirst({ where: { id, store_id: storeId } });
          if (!existing) {
            req.set.status = 404;
            return { success: false, message: "Location not found" };
          }

          const location = await prisma.locations.update({ where: { id }, data: r.data });
          return { success: true, location };
        })

        .delete("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid location ID" };
          }

          const existing = await prisma.locations.findFirst({ where: { id, store_id: storeId } });
          if (!existing) {
            req.set.status = 404;
            return { success: false, message: "Location not found" };
          }

          await prisma.locations.delete({ where: { id } });
          return { success: true, message: "Location deleted successfully" };
        })
    );

    return router;
  }
}

export { LocationsRoutes };
