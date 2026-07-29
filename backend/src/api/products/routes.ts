import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission } from "../auth/permissions";

class ProductsRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission("products:read") }, (app) =>
      app
        .get("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const url = new URL(req.request.url);
          const pageParam = url.searchParams.get("page");
          const limitParam = url.searchParams.get("limit");
          const searchParam = url.searchParams.get("search")?.trim();
          const categoryIdParam = url.searchParams.get("category_id");

          const whereClause: any = { store_id: storeId };
          if (searchParam) {
            whereClause.OR = [
              { name: { contains: searchParam, mode: "insensitive" } },
              { sku: { contains: searchParam, mode: "insensitive" } },
            ];
          }
          if (categoryIdParam && !isNaN(Number(categoryIdParam))) {
            whereClause.category_id = Number(categoryIdParam);
          }

          if (pageParam || limitParam) {
            const page = Math.max(1, Number(pageParam) || 1);
            const limit = Math.max(1, Math.min(500, Number(limitParam) || 20));
            const skip = (page - 1) * limit;

            const [total, products] = await Promise.all([
              prisma.products.count({ where: whereClause }),
              prisma.products.findMany({
                where: whereClause,
                orderBy: { id: "desc" },
                skip,
                take: limit,
              }),
            ]);

            return {
              success: true,
              products,
              pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
              },
            };
          }

          const products = await prisma.products.findMany({
            where: whereClause,
            orderBy: { id: "desc" },
          });
          return { success: true, products };
        })
        .get("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid product ID" };
          }

          const product = await prisma.products.findFirst({ where: { id, store_id: storeId } });
          if (!product) {
            req.set.status = 404;
            return { success: false, message: "Product not found" };
          }

          return { success: true, product };
        }),
    );

    router.guard({ beforeHandle: requireStorePermission("products:write") }, (app) =>
      app
        .post("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const schema = z.object({
            sku: z.string().min(1),
            category_id: z.number().int().positive(),
            name: z.string().min(1),
            description: z.string().optional(),
            cost_price: z.coerce.number().min(0).optional(),
            selling_price: z.coerce.number().min(0).optional(),
            reorder_point: z.coerce.number().int().nonnegative().optional(),
            image_id: z.number().int().positive().nullable().optional(),
            is_active: z.boolean().optional(),
          });

          const parsed = schema.safeParse(req.body);
          if (!parsed.success) {
            req.set.status = 400;
            return {
              success: false,
              message: "Invalid request body",
              errors: parsed.error.flatten().fieldErrors,
            };
          }

          const category = await prisma.categories.findFirst({
            where: { id: parsed.data.category_id, store_id: storeId },
          });
          if (!category) {
            req.set.status = 400;
            return { success: false, message: "Category not found in this store" };
          }

          try {
            const product = await prisma.products.create({
              data: {
                store_id: storeId,
                sku: parsed.data.sku,
                category_id: parsed.data.category_id,
                name: parsed.data.name,
                description: parsed.data.description,
                cost_price: parsed.data.cost_price,
                selling_price: parsed.data.selling_price,
                reorder_point: parsed.data.reorder_point,
                image_id: parsed.data.image_id,
                is_active: parsed.data.is_active,
              },
            });

            return { success: true, product };
          } catch {
            req.set.status = 400;
            return { success: false, message: "Unable to create product" };
          }
        })

        .patch("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid product ID" };
          }

          const schema = z.object({
            sku: z.string().min(1).optional(),
            category_id: z.number().int().positive().optional(),
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            cost_price: z.coerce.number().min(0).optional(),
            selling_price: z.coerce.number().min(0).optional(),
            reorder_point: z.coerce.number().int().nonnegative().optional(),
            image_id: z.number().int().positive().nullable().optional(),
            is_active: z.boolean().optional(),
          });

          const parsed = schema.safeParse(req.body);
          if (!parsed.success) {
            req.set.status = 400;
            return {
              success: false,
              message: "Invalid request body",
              errors: parsed.error.flatten().fieldErrors,
            };
          }

          if (Object.keys(parsed.data).length === 0) {
            req.set.status = 400;
            return { success: false, message: "No fields to update" };
          }

          const existing = await prisma.products.findFirst({ where: { id, store_id: storeId } });
          if (!existing) {
            req.set.status = 404;
            return { success: false, message: "Product not found" };
          }

          if (parsed.data.category_id !== undefined) {
            const category = await prisma.categories.findFirst({
              where: { id: parsed.data.category_id, store_id: storeId },
            });
            if (!category) {
              req.set.status = 400;
              return { success: false, message: "Category not found in this store" };
            }
          }

          try {
            const product = await prisma.products.update({
              where: { id },
              data: parsed.data,
            });
            return { success: true, product };
          } catch {
            req.set.status = 400;
            return { success: false, message: "Unable to update product" };
          }
        })

        .delete("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid product ID" };
          }

          const product = await prisma.products.findFirst({ where: { id, store_id: storeId } });
          if (!product) {
            req.set.status = 404;
            return { success: false, message: "Product not found" };
          }

          await prisma.products.delete({ where: { id } });
          return { success: true, message: "Product deleted successfully" };
        }),
    );

    return router;
  }
}

export { ProductsRoutes };
