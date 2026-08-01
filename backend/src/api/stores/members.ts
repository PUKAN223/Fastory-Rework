import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { getAuthSession, requireStorePermission } from "../auth/permissions";
import { getDefaultPermissions } from "../auth/roles";

class StoreMembersRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard(
      { beforeHandle: requireStorePermission("settings:read") },
      (app) =>
        app
          .get("/", async (req) => {
            const storeId = Number((req as any).params.storeId);
            const members = await prisma.store_members.findMany({
              where: { store_id: storeId },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    profile_image_id: true,
                  },
                },
              },
            });

            return { success: true, members };
          })
          .get("/logs", async (req) => {
            const storeId = Number((req as any).params.storeId);
            const filterUserId = req.query.userId ? Number(req.query.userId) : undefined;
            const filterType = req.query.type ? String(req.query.type) : undefined;
            const days = req.query.days ? Number(req.query.days) : undefined;

            const sinceDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;

            const storeMembers = await prisma.store_members.findMany({
              where: { store_id: storeId },
              include: {
                user: {
                  select: { id: true, username: true, email: true },
                },
              },
            });

            const userJobTitleMap = new Map<number, string>();
            storeMembers.forEach((m) => {
              userJobTitleMap.set(m.user_id, m.job_title || "พนักงาน");
            });

            const fetchLimit = req.query.limit ? Math.min(Number(req.query.limit), 3000) : 1000;

            // 1. Fetch Orders (Sales & Voids)
            const orders = await prisma.orders.findMany({
              where: {
                store_id: storeId,
                ...(sinceDate ? { created_at: { gte: sinceDate } } : {}),
                ...(filterUserId
                  ? { OR: [{ created_by: filterUserId }, { voided_by: filterUserId }] }
                  : {}),
              },
              include: {
                creator: { select: { id: true, username: true, email: true } },
                voider: { select: { id: true, username: true, email: true } },
                items: true,
              },
              orderBy: { created_at: "desc" },
              take: fetchLimit,
            });

            // 2. Fetch Stock Movements
            const stockMovements = await prisma.product_stock_movements.findMany({
              where: {
                store_id: storeId,
                reason: { notIn: ["sale", "voided_sale"] },
                ...(sinceDate ? { created_at: { gte: sinceDate } } : {}),
                ...(filterUserId ? { created_by: filterUserId } : {}),
              },
              include: {
                users: { select: { id: true, username: true, email: true } },
                products: { select: { id: true, name: true, sku: true } },
              },
              orderBy: { created_at: "desc" },
              take: fetchLimit,
            });

            const logs: any[] = [];

            for (const order of orders) {
              if (order.created_by && (!filterUserId || order.created_by === filterUserId)) {
                logs.push({
                  id: `order-sale-${order.id}`,
                  type: "sale",
                  actionTitle: `ขายสินค้า (${order.order_number})`,
                  details: `ยอดรวม ฿${Number(order.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} (${order.items.length} รายการ) • ชำระผ่าน ${order.payment_method === "promptpay" ? "PromptPay" : "เงินสด"}`,
                  amount: Number(order.total),
                  orderNumber: order.order_number,
                  user: {
                    id: order.creator.id,
                    username: order.creator.username,
                    email: order.creator.email,
                    jobTitle: userJobTitleMap.get(order.creator.id) || "พนักงาน",
                  },
                  createdAt: order.created_at.toISOString(),
                });
              }

              if (order.status === "voided" && order.voided_by && order.voided_at) {
                if (!filterUserId || order.voided_by === filterUserId) {
                  const voiderUser = order.voider || order.creator;
                  logs.push({
                    id: `order-void-${order.id}`,
                    type: "void_sale",
                    actionTitle: `ยกเลิกคำสั่งซื้อ (${order.order_number})`,
                    details: `ยกเลิกยอดเงิน ฿${Number(order.total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} • คืนสต็อกสินค้าเข้าคลัง`,
                    amount: Number(order.total),
                    orderNumber: order.order_number,
                    user: {
                      id: voiderUser.id,
                      username: voiderUser.username,
                      email: voiderUser.email,
                      jobTitle: userJobTitleMap.get(voiderUser.id) || "พนักงาน",
                    },
                    createdAt: order.voided_at.toISOString(),
                  });
                }
              }
            }

            for (const sm of stockMovements) {
              if (sm.users && (!filterUserId || sm.created_by === filterUserId)) {
                const deltaText = sm.delta > 0 ? `+${sm.delta}` : `${sm.delta}`;
                logs.push({
                  id: `stock-${sm.id}`,
                  type: sm.reason === "restock" ? "restock" : "stock_adjustment",
                  actionTitle:
                    sm.reason === "restock"
                      ? `เติมสต็อกสินค้า (${sm.products.name})`
                      : `ปรับปรุงสต็อก (${sm.products.name})`,
                  details: `จำนวน: ${deltaText} ชิ้น (SKU: ${sm.products.sku})${sm.note ? ` • หมายเหตุ: ${sm.note}` : ""}`,
                  user: {
                    id: sm.users.id,
                    username: sm.users.username,
                    email: sm.users.email,
                    jobTitle: userJobTitleMap.get(sm.users.id) || "พนักงาน",
                  },
                  createdAt: sm.created_at.toISOString(),
                });
              }
            }

            logs.sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );

            let filteredLogs = logs;
            if (filterType && filterType !== "all") {
              filteredLogs = logs.filter((l) => l.type === filterType);
            }

            return { success: true, logs: filteredLogs };
          }),
    );

    router.guard(
      { beforeHandle: requireStorePermission("settings:write") },
      (app) =>
        app
          .post("/", async (req) => {
            const storeId = Number((req as any).params.storeId);
            const schema = z.object({
              emailOrUsername: z.string().min(1),
              jobTitle: z.string().optional(),
              permissions: z.any().optional(),
            });

            const parsed = schema.safeParse(req.body);
            if (!parsed.success) {
              req.set.status = 400;
              return {
                success: false,
                message: "Invalid request body",
              };
            }

            const { emailOrUsername, jobTitle, permissions } = parsed.data;

            const user = await prisma.users.findFirst({
              where: {
                OR: [
                  { email: emailOrUsername },
                  { username: emailOrUsername },
                ],
              },
            });

            if (!user) {
              req.set.status = 404;
              return {
                success: false,
                message: "ไม่พบผู้ใช้นี้ในระบบ กรุณาตรวจสอบ Username หรือ Email อีกครั้ง",
              };
            }

            const existingMember = await prisma.store_members.findFirst({
              where: { store_id: storeId, user_id: user.id },
            });

            if (existingMember) {
              req.set.status = 400;
              return { success: false, message: "ผู้ใช้นี้เป็นพนักงานในร้านค้านี้อยู่แล้ว" };
            }

            const member = await prisma.store_members.create({
              data: {
                store_id: storeId,
                user_id: user.id,
                job_title: jobTitle,
                permissions: permissions ??
                  getDefaultPermissions(jobTitle ?? "พนักงาน"),
              },
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    profile_image_id: true,
                  },
                },
              },
            });

            return { success: true, member };
          })
          .patch("/:memberId", async (req) => {
            const storeId = Number((req as any).params.storeId);
            const memberId = Number(req.params.memberId);

            const schema = z.object({
              jobTitle: z.string().optional(),
              permissions: z.any().optional(),
            });

            const parsed = schema.safeParse(req.body);
            if (!parsed.success) {
              req.set.status = 400;
              return {
                success: false,
                message: "Invalid request body",
              };
            }

            const { jobTitle, permissions } = parsed.data;

            const existing = await prisma.store_members.findUnique({
              where: { id: memberId },
            });

            if (!existing || existing.store_id !== storeId) {
              req.set.status = 404;
              return {
                success: false,
                message: "Member not found in this store",
              };
            }

            const updateData: any = {};
            if (jobTitle !== undefined) {
              updateData.job_title = jobTitle;
              if (permissions === undefined) {
                updateData.permissions = getDefaultPermissions(jobTitle);
              }
            }
            if (permissions !== undefined) updateData.permissions = permissions;

            const member = await prisma.store_members.update({
              where: { id: memberId },
              data: updateData,
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    profile_image_id: true,
                  },
                },
              },
            });

            return { success: true, member };
          })
          .delete("/:memberId", async (req) => {
            const storeId = Number((req as any).params.storeId);
            const memberId = Number(req.params.memberId);

            const existing = await prisma.store_members.findUnique({
              where: { id: memberId },
            });

            if (!existing || existing.store_id !== storeId) {
              req.set.status = 404;
              return {
                success: false,
                message: "Member not found in this store",
              };
            }

            const session = getAuthSession(req.headers.authorization);
            if (
              session?.user?.id &&
              Number(existing.user_id) === Number(session.user.id)
            ) {
              req.set.status = 400;
              return {
                success: false,
                message: "ไม่สามารถลบตัวเองออกจากร้านค้าได้",
              };
            }

            await prisma.store_members.delete({
              where: { id: memberId },
            });

            return { success: true };
          }),
    );

    return router;
  }
}

export { StoreMembersRoutes };
