import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { getAuthSession, requireAuth, requireStorePermission } from "../auth/permissions";

class StoresRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireAuth() }, (app) =>
      app
        .get("/", async ({ headers }) => {
          const session = getAuthSession(headers.authorization)!;
          const memberships = await prisma.store_members.findMany({
            where: { user_id: session.user.id },
            include: {
              store: {
                include: {
                  _count: {
                    select: {
                      products: true,
                      members: true,
                    },
                  },
                },
              },
            },
            orderBy: { created_at: "asc" },
          });

          return {
            success: true,
            stores: memberships.map((membership) => ({
              id: membership.store.id,
              name: membership.store.name,
              slug: membership.store.slug,
              description: membership.store.description,
              icon: membership.store.icon,
              is_active: membership.store.is_active,
              receiptHeader: membership.store.receipt_header,
              receiptFooter: membership.store.receipt_footer,
              receiptTaxId: membership.store.receipt_tax_id,
              promptpayId: membership.store.promptpay_id,
              jobTitle: membership.job_title,
              permissions: membership.permissions,
              productCount: membership.store._count.products,
              memberCount: membership.store._count.members,
            })),
          };
        })
        .post("/", async (req) => {
          const session = getAuthSession(req.headers.authorization)!;
          const schema = z.object({
            name: z.string().min(1),
            slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
            description: z.string().optional(),
            icon: z.string().optional(),
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



          try {
            const store = await prisma.stores.create({
              data: {
                name: parsed.data.name,
                slug: parsed.data.slug ?? slugify(parsed.data.name),
                description: parsed.data.description,
                icon: parsed.data.icon,
                owner_id: session.user.id,
                members: {
                  create: {
                    user_id: session.user.id,
                    job_title: "เจ้าของร้าน",
                    permissions: { "*": true },
                  },
                },
              },
            });

            return {
              success: true,
              store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
                description: store.description,
                icon: store.icon,
                is_active: store.is_active,
                receiptHeader: store.receipt_header,
                receiptFooter: store.receipt_footer,
                receiptTaxId: store.receipt_tax_id,
                promptpayId: store.promptpay_id,
                jobTitle: "เจ้าของร้าน",
                permissions: { "*": true },
                productCount: 0,
                memberCount: 1,
              },
            };
          } catch {
            req.set.status = 409;
            return { success: false, message: "Store slug already exists" };
          }
        })
    );

    router.guard({ beforeHandle: requireStorePermission("stores:read") }, (app) =>
      app.get("/:storeId", async (req) => {
        const storeId = Number(req.params.storeId);
        const store = await prisma.stores.findUnique({ where: { id: storeId } });
        if (!store) {
          req.set.status = 404;
          return { success: false, message: "Store not found" };
        }

        return { success: true, store };
      })
    );

    router.guard({ beforeHandle: requireStorePermission("settings:write") }, (app) =>
      app
        .patch("/:storeId", async (req) => {
          const storeId = Number(req.params.storeId);
          const schema = z.object({
            name: z.string().min(1).optional(),
            slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
            description: z.string().nullable().optional(),
            icon: z.string().nullable().optional(),
            is_active: z.boolean().optional(),
            receiptHeader: z.string().nullable().optional(),
            receiptFooter: z.string().nullable().optional(),
            receiptTaxId: z.string().nullable().optional(),
            promptpayId: z.string().nullable().optional(),
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

          try {
            const updateData: any = { ...parsed.data };
            if (updateData.receiptHeader !== undefined) {
              updateData.receipt_header = updateData.receiptHeader;
              delete updateData.receiptHeader;
            }
            if (updateData.receiptFooter !== undefined) {
              updateData.receipt_footer = updateData.receiptFooter;
              delete updateData.receiptFooter;
            }
            if (updateData.receiptTaxId !== undefined) {
              updateData.receipt_tax_id = updateData.receiptTaxId;
              delete updateData.receiptTaxId;
            }
            if (updateData.promptpayId !== undefined) {
              updateData.promptpay_id = updateData.promptpayId;
              delete updateData.promptpayId;
            }
            const store = await prisma.stores.update({
              where: { id: storeId },
              data: updateData,
            });
            return {
              success: true,
              store: {
                id: store.id,
                name: store.name,
                slug: store.slug,
                description: store.description,
                icon: store.icon,
                is_active: store.is_active,
                receiptHeader: store.receipt_header,
                receiptFooter: store.receipt_footer,
                receiptTaxId: store.receipt_tax_id,
                promptpayId: store.promptpay_id,
              },
            };
          } catch (e: any) {
            console.error("PATCH STORE ERROR:", e);
            if (e.code === "P2002") {
              req.set.status = 409;
              return { success: false, message: "ที่อยู่ร้านค้า (Slug) นี้ถูกใช้งานแล้ว" };
            }
            req.set.status = 404;
            return { success: false, message: "ไม่พบร้านค้าหรือการแก้ไขล้มเหลว" };
          }
        })
    );

    router.guard({ beforeHandle: requireStorePermission("store:delete") }, (app) =>
      app
        .delete("/:storeId", async (req) => {
          const storeId = Number(req.params.storeId);
          const session = getAuthSession(req.headers.authorization);
          if (!session || !session.user) {
            req.set.status = 401;
            return { success: false, message: "Unauthorized" };
          }

          const schema = z.object({
            password: z.string().min(1),
          });

          const parsed = schema.safeParse(req.body);
          if (!parsed.success) {
            req.set.status = 400;
            return { success: false, message: "กรุณากรอกรหัสผ่านเพื่อยืนยันการลบ" };
          }

          const userObj = await prisma.users.findUnique({
            where: { id: session.user.id },
          });

          if (!userObj || userObj.password_hash !== parsed.data.password) {
            req.set.status = 400;
            return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
          }

          try {
            await prisma.stores.delete({ where: { id: storeId } });
            return { success: true, message: "ลบร้านค้าสำเร็จ" };
          } catch {
            req.set.status = 404;
            return { success: false, message: "ไม่พบร้านค้าที่ต้องการลบ" };
          }
        })
    );

    return router;
  }
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `store-${Date.now()}`;
}

export { StoresRoutes };
