import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireStorePermission, getAuthSession } from "../auth/permissions";
import generatePayload from "promptpay-qr";

// In-memory store for POS sessions
// Key: storeId
const posSessions = new Map<number, any>();


class SalesRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireStorePermission("sales:read") }, (app) =>
      app
        .get("/", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const limit = req.query.limit ? Number(req.query.limit) : 50;

          const orders = await prisma.orders.findMany({
            where: { store_id: storeId },
            take: limit,
            include: {
              items: true,
              creator: { select: { id: true, username: true } },
              voider: { select: { id: true, username: true } }
            },
            orderBy: { created_at: "desc" }
          });
          return { success: true, orders };
        })
        .get("/pos-sync", async (req) => {
          const storeId = Number((req as any).params.storeId);
          return { success: true, state: posSessions.get(storeId) || null };
        })
        .post("/pos-sync", async (req) => {
          const storeId = Number((req as any).params.storeId);
          posSessions.set(storeId, req.body);
          return { success: true };
        })
    );

    router.guard({ beforeHandle: requireStorePermission("reports:read") }, (app) =>
      app
        .get("/summary", async (req) => {
          const storeId = Number((req as any).params.storeId);
          
          // Get all completed orders for the store
          const orders = await prisma.orders.findMany({
            where: { store_id: storeId, status: "completed" },
            include: { items: true },
            orderBy: { created_at: "desc" }
          });

          let totalOrders = 0;
          let totalRevenue = 0;
          let cashTotal = 0;
          let promptpayTotal = 0;

          // For trends (last 7 days)
          const now = new Date();
          const salesTrendsMap = new Map<string, number>();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split("T")[0]; // YYYY-MM-DD
            salesTrendsMap.set(dateString, 0);
          }

          // For top products
          const productMap = new Map<number, { productId: number; productName: string; quantity: number; revenue: number }>();

          for (const order of orders) {
            totalOrders++;
            totalRevenue += Number(order.total);
            if (order.payment_method === "cash") {
              cashTotal += Number(order.total);
            } else if (order.payment_method === "promptpay") {
              promptpayTotal += Number(order.total);
            }

            const orderDateStr = new Date(order.created_at).toISOString().split("T")[0];
            if (salesTrendsMap.has(orderDateStr)) {
              salesTrendsMap.set(orderDateStr, salesTrendsMap.get(orderDateStr)! + Number(order.total));
            }

            for (const item of order.items) {
              const pId = item.product_id;
              if (!productMap.has(pId)) {
                productMap.set(pId, { productId: pId, productName: item.product_name, quantity: 0, revenue: 0 });
              }
              const p = productMap.get(pId)!;
              p.quantity += item.quantity;
              p.revenue += Number(item.total_price);
            }
          }

          const salesTrends = Array.from(salesTrendsMap.entries()).map(([date, revenue]) => ({ date, revenue }));
          const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

          return {
            success: true,
            summary: {
              totalOrders,
              totalRevenue,
              cashTotal,
              promptpayTotal,
              salesTrends,
              topProducts,
            },
          };
        })
    );

    router.guard({ beforeHandle: requireStorePermission("sales:read") }, (app) =>
      app
        .get("/:id", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid order ID" };
          }

          const order = await prisma.orders.findFirst({
            where: { id, store_id: storeId },
            include: {
              items: true,
              creator: { select: { id: true, username: true } },
              voider: { select: { id: true, username: true } }
            }
          });
          
          if (!order) {
            req.set.status = 404;
            return { success: false, message: "Order not found" };
          }

          // Auto-expire pending orders after 5 minutes
          if (order.status === "pending" && Date.now() - new Date(order.created_at).getTime() > 5 * 60 * 1000) {
            try {
              const expiredOrder = await prisma.$transaction(async (tx) => {
                const updated = await tx.orders.update({
                  where: { id: order.id },
                  data: {
                    status: "voided",
                    voided_at: new Date()
                  },
                  include: {
                    items: true,
                    creator: { select: { id: true, username: true } },
                    voider: { select: { id: true, username: true } }
                  }
                });

                for (const item of order.items) {
                  await tx.product_stock_movements.create({
                    data: {
                      store_id: storeId,
                      product_id: item.product_id,
                      delta: item.quantity,
                      reason: "voided_sale",
                      note: `Auto-expired PromptPay order: ${order.order_number}`,
                    }
                  });

                  await tx.products.update({
                    where: { id: item.product_id },
                    data: { stock_on_hand: { increment: item.quantity } }
                  });
                }

                return updated;
              });

              return { success: true, order: expiredOrder };
            } catch (e) {
              console.error("Auto-expire order error:", e);
            }
          }

          return { success: true, order };
        }),
    );

    router.guard({ beforeHandle: requireStorePermission("sales:write") }, (app) =>
      app
        .post("/", async (req) => {
          const storeId = Number((req as any).params.storeId);

          const session = getAuthSession(req.headers.authorization);
          if (!session || !session.user) {
            req.set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          const userId = session.user.id;
          
          const itemSchema = z.object({
            product_id: z.number().int().positive(),
            quantity: z.number().int().positive(),
          });
          
          const schema = z.object({
            order_number: z.string().min(1),
            payment_method: z.string().min(1),
            discount: z.coerce.number().min(0).default(0),
            amount_received: z.coerce.number().min(0).optional(),
            note: z.string().optional(),
            items: z.array(itemSchema).min(1)
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

          const itemsData = parsed.data.items;
          const productIds = itemsData.map(i => i.product_id);
          
          const products = await prisma.products.findMany({
            where: { id: { in: productIds }, store_id: storeId }
          });
          
          if (products.length !== productIds.length) {
            req.set.status = 400;
            return { success: false, message: "One or more products not found" };
          }
          
          let subtotal = 0;
          const orderItemsData: any[] = [];
          const stockMovementsData: any[] = [];
          
          for (const item of itemsData) {
            const product = products.find(p => p.id === item.product_id)!;
            if (product.stock_on_hand < item.quantity) {
              req.set.status = 400;
              return { success: false, message: `Insufficient stock for product SKU ${product.sku}` };
            }
            const unitPrice = Number(product.selling_price);
            const totalPrice = unitPrice * item.quantity;
            subtotal += totalPrice;
            
            orderItemsData.push({
              product_id: product.id,
              product_name: product.name,
              product_sku: product.sku,
              quantity: item.quantity,
              unit_price: unitPrice,
              total_price: totalPrice
            });
            
            stockMovementsData.push({
              store_id: storeId,
              product_id: product.id,
              delta: -item.quantity,
              reason: "sale",
              note: `Sale order: ${parsed.data.order_number}`,
              created_by: userId
            });
          }
          
          const total = subtotal - parsed.data.discount;
          const change = parsed.data.amount_received ? parsed.data.amount_received - total : null;

          let status = "completed";
          let promptpayAmount: number | null = null;
          let promptpayPayload: string | null = null;

          if (parsed.data.payment_method === "promptpay") {
            status = "pending";
            // Get store's promptpay_id
            const store = await prisma.stores.findUnique({ where: { id: storeId } });
            
            // Use exact total amount without satang additions
            promptpayAmount = total;

            if (store?.promptpay_id) {
              promptpayPayload = generatePayload(store.promptpay_id, { amount: promptpayAmount });
            }
          }

          try {
            const result = await prisma.$transaction(async (tx) => {
              const order = await tx.orders.create({
                data: {
                  store_id: storeId,
                  order_number: parsed.data.order_number,
                  status,
                  payment_method: parsed.data.payment_method,
                  promptpay_amount: promptpayAmount,
                  subtotal,
                  discount: parsed.data.discount,
                  total,
                  amount_received: parsed.data.amount_received,
                  change_amount: change,
                  note: parsed.data.note,
                  created_by: userId,
                  items: {
                    create: orderItemsData
                  }
                },
                include: { items: true }
              });

              for (const movement of stockMovementsData) {
                await tx.product_stock_movements.create({ data: movement });
                await tx.products.update({
                  where: { id: movement.product_id },
                  data: { stock_on_hand: { decrement: Math.abs(movement.delta) } }
                });
              }

              return order;
            });

            return { success: true, order: result, promptpayPayload };
          } catch (e) {
            console.error(e);
            req.set.status = 500;
            return { success: false, message: "Failed to create order" };
          }
        })

        .post("/:id/void", async (req) => {
          const storeId = Number((req as any).params.storeId);
          const id = Number(req.params.id);

          const session = getAuthSession(req.headers.authorization);
          if (!session || !session.user) {
            req.set.status = 401;
            return { success: false, message: "Unauthorized" };
          }
          const userId = session.user.id;

          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid order ID" };
          }

          const order = await prisma.orders.findFirst({
            where: { id, store_id: storeId },
            include: { items: true }
          });

          if (!order) {
            req.set.status = 404;
            return { success: false, message: "Order not found" };
          }

          if (order.status === "voided") {
            req.set.status = 400;
            return { success: false, message: "Order is already voided" };
          }

          try {
            const result = await prisma.$transaction(async (tx) => {
              const updatedOrder = await tx.orders.update({
                where: { id },
                data: {
                  status: "voided",
                  voided_by: userId,
                  voided_at: new Date()
                }
              });

              for (const item of order.items) {
                await tx.product_stock_movements.create({
                  data: {
                    store_id: storeId,
                    product_id: item.product_id,
                    delta: item.quantity,
                    reason: "voided_sale",
                    note: `Voided order: ${order.order_number}`,
                    created_by: userId
                  }
                });

                await tx.products.update({
                  where: { id: item.product_id },
                  data: { stock_on_hand: { increment: item.quantity } }
                });
              }

              return updatedOrder;
            });

            return { success: true, order: result };
          } catch (e) {
            console.error(e);
            req.set.status = 500;
            return { success: false, message: "Failed to void order" };
          }
        }),
    );

    return router;
  }
}

export { SalesRoutes };
