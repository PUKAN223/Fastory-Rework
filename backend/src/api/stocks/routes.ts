import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission, getAuthSession } from "../auth/permissions";

class StocksRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission("stocks:read") }, (app) =>
      app.get("/movements", async (req) => {
        const storeId = Number((req as any).params.storeId);
        
        const movements = await prisma.product_stock_movements.findMany({
          where: { store_id: storeId },
          orderBy: { created_at: "desc" },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            },
            users: {
              select: {
                id: true,
                username: true
              }
            }
          }
        });

        const serialized = movements.map((m) => ({
          ...m,
          id: Number(m.id),
        }));

        return { success: true, movements: serialized };
      })
    );

    router.guard({ beforeHandle: requireStorePermission("stocks:write") }, (app) =>
      app.post("/movements", async (req) => {
        const storeId = Number((req as any).params.storeId);
        
        const schema = z.object({
          productId: z.number().int().positive(),
          delta: z.number().int(),
          reason: z.string().min(1),
          note: z.string().optional()
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

        const session = getAuthSession(req.headers.authorization);
        if (!session || !session.user) {
          req.set.status = 401;
          return { success: false, message: "Unauthorized" };
        }

        const { productId, delta, reason, note } = parsed.data;

        try {
          const result = await prisma.$transaction(async (tx) => {
            const currentProduct = await tx.products.findFirst({
              where: { id: productId, store_id: storeId }
            });

            if (!currentProduct) {
              throw new Error("Product not found");
            }

            if (currentProduct.stock_on_hand + delta < 0) {
              throw new Error("สต็อกไม่เพียงพอ");
            }

            const updatedProduct = await tx.products.update({
              where: { id: productId },
              data: {
                stock_on_hand: { increment: delta },
                stock_updated_at: new Date()
              }
            });

            const movement = await tx.product_stock_movements.create({
              data: {
                store_id: storeId,
                product_id: productId,
                delta,
                reason,
                note: note || null,
                created_by: session.user.id
              },
              include: {
                products: {
                  select: {
                    id: true,
                    name: true,
                    sku: true
                  }
                },
                users: {
                  select: {
                    id: true,
                    username: true
                  }
                }
              }
            });

            return {
              movement: {
                ...movement,
                id: Number(movement.id),
              },
              updatedProduct,
            };
          });

          return { success: true, ...result };
        } catch (error: any) {
          req.set.status = 400;
          return { success: false, message: error.message || "Failed to create movement" };
        }
      })
    );

    return router;
  }
}

export { StocksRoutes };
