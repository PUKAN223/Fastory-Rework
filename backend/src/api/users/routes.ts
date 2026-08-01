import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { getAuthSession, requirePermission } from "../auth/permissions";
import { authSessionStore } from "../auth/sessionStore";

class UsersRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.patch("/me", async (req) => {
      const session = getAuthSession(req.headers.authorization);
      if (!session) {
        req.set.status = 401;
        return { success: false, message: "Missing or invalid access token" };
      }

      const schema = z.object({
        username: z.string().min(1).optional(),
        profile_picture: z.string().nullable().optional(),
        bio: z.string().nullable().optional(),
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

      const { username, profile_picture, bio } = parsed.data;
      if (
        username === undefined &&
        profile_picture === undefined &&
        bio === undefined
      ) {
        req.set.status = 400;
        return { success: false, message: "No fields to update" };
      }

      try {
        const updatedUser = await prisma.users.update({
          where: { id: session.user.id },
          data: {
            ...(username !== undefined ? { username } : {}),
            ...(profile_picture !== undefined ? { profile_picture } : {}),
            ...(bio !== undefined ? { bio } : {}),
          },
          include: {
            roles: true,
            storeMemberships: { include: { store: true } },
          },
        });

        // Update session state
        session.user.username = updatedUser.username;
        session.user.profile_picture_url = updatedUser.profile_picture ?? null;
        session.user.bio = updatedUser.bio ?? null;

        return {
          success: true,
          message: "Profile updated successfully",
          user: session.user,
        };
      } catch (err: any) {
        req.set.status = 400;
        return {
          success: false,
          message: err?.message || "Failed to update profile",
        };
      }
    });

    router.delete("/me", async (req) => {
      const session = getAuthSession(req.headers.authorization);
      if (!session) {
        req.set.status = 401;
        return { success: false, message: "Missing or invalid access token" };
      }

      const body = (req.body ?? {}) as { password?: string; confirmation?: string };
      const user = await prisma.users.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        req.set.status = 404;
        return { success: false, message: "User not found" };
      }

      // Check if user owns any stores
      const ownedStores = await prisma.stores.findMany({
        where: { owner_id: session.user.id },
        select: { id: true, name: true },
      });

      if (ownedStores.length > 0) {
        req.set.status = 400;
        const storeNames = ownedStores.map((s) => `"${s.name}"`).join(", ");
        return {
          success: false,
          message: `ไม่สามารถลบบัญชีได้ เนื่องจากคุณยังเป็นเจ้าของร้านค้า (${storeNames}) กรุณาลบร้านค้าของคุณก่อนดำเนินการ`,
        };
      }

      if (user.password_hash) {
        if (!body.password || body.password !== user.password_hash) {
          req.set.status = 400;
          return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
        }
      }

      try {
        await prisma.users.delete({ where: { id: session.user.id } });
        authSessionStore.deleteByAccessToken(session.accessToken);

        return { success: true, message: "Account deleted successfully" };
      } catch (err: any) {
        req.set.status = 500;
        return {
          success: false,
          message: err?.message || "Failed to delete account",
        };
      }
    });

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
