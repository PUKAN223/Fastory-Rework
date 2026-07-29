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
        app.get("/", async (req) => {
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
