import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission } from "../auth/permissions";

class CategoriesRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission("categories:read", "sales:write", "sales:read") }, (app) =>
      app
        .get("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const categories = await prisma.categories.findMany({
            where: { store_id: storeId },
            include: {
              _count: {
                select: { products: true },
              },
            },
            orderBy: { created_at: "desc" },
          });

          const categoriesWithProductCount = categories.map((c) => ({
            id: c.id,
            store_id: c.store_id,
            name: c.name,
            description: c.description,
            icon_id: c.icon_id,
            created_at: c.created_at,
            updated_at: c.updated_at,
            deleted_at: c.deleted_at,
            productCount: c._count.products,
          }));

          return { success: true, categories: categoriesWithProductCount };
        })

        .get("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid category ID" };
          }

          const category = await prisma.categories.findFirst({
            where: { id, store_id: storeId },
            include: {
              _count: {
                select: { products: true },
              },
            },
          });

          if (!category) {
            req.set.status = 404;
            return { success: false, message: "Category not found" };
          }

          const { _count, ...rest } = category;
          return { success: true, category: { ...rest, productCount: _count.products } };
        })
    );

    router.guard({ beforeHandle: requireStorePermission("categories:write") }, (app) =>
      app
        .post("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const schema = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            icon_id: z.string().optional(),
          });

          const r = schema.safeParse(req.body);
          if (!r.success) {
            req.set.status = 400;
            return { success: false, message: "Invalid request body", errors: r.error.flatten().fieldErrors };
          }

          const category = await prisma.categories.create({
            data: {
              store_id: storeId,
              name: r.data.name,
              description: r.data.description,
              icon_id: r.data.icon_id,
            },
          });

          return { success: true, category };
        })

        .patch("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid category ID" };
          }

          const schema = z.object({
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            icon_id: z.string().optional(),
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

          const existing = await prisma.categories.findFirst({ where: { id, store_id: storeId } });
          if (!existing) {
            req.set.status = 404;
            return { success: false, message: "Category not found" };
          }

          const category = await prisma.categories.update({ where: { id }, data: r.data });
          return { success: true, category };
        })

        .delete("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid category ID" };
          }

          const inUseCount = await prisma.products.count({
            where: { category_id: id, store_id: storeId },
          });

          if (inUseCount > 0) {
            req.set.status = 409;
            return {
              success: false,
              message: "ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีสินค้ากำลังใช้งานอยู่",
            };
          }

          const existing = await prisma.categories.findFirst({ where: { id, store_id: storeId } });
          if (!existing) {
            req.set.status = 404;
            return { success: false, message: "Category not found" };
          }

          await prisma.categories.delete({ where: { id } });
          return { success: true, message: "Category deleted successfully" };
        })
    );

    return router;
  }
}

export { CategoriesRoutes };
