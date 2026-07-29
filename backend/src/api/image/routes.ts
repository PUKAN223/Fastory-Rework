import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "../auth/permissions";

const base64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const dataUrlBase64Pattern = /^data:[^;]+;base64,[A-Za-z0-9+/=]+$/i;

const imageUrlSchema = z.string().min(1).refine(
  (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return false;

    const isDataUrlBase64 = dataUrlBase64Pattern.test(trimmedValue);
    if (isDataUrlBase64) return true;

    const rawBase64 = trimmedValue.replace(/\s/g, "");
    const isRawBase64 =
      rawBase64.length > 0 &&
      rawBase64.length % 4 === 0 &&
      base64Pattern.test(rawBase64);
    if (isRawBase64) return true;

    return z.url().safeParse(trimmedValue).success;
  },
  {
    message: "url must be a valid URL, data URL base64, or raw base64 string",
  },
);

class ImagesRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    router.guard({ beforeHandle: requireAuth() }, (app) =>
      app
        .post("/", async (req) => {
          const schema = z.object({
            url: imageUrlSchema,
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

          const image = await prisma.images.create({
            data: {
              url: parsed.data.url.trim(),
            },
          });

          return { success: true, image };
        })
        .get("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid image ID" };
          }

          const image = await prisma.images.findUnique({ where: { id } });
          if (!image) {
            req.set.status = 404;
            return { success: false, message: "Image not found" };
          }

          return { success: true, image };
        })
        .get("/", async () => {
          const images = await prisma.images.findMany();
          return { success: true, images };
        })
        .patch("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid image ID" };
          }

          const schema = z.object({
            url: imageUrlSchema.optional(),
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
            const image = await prisma.images.update({
              where: { id },
              data: {
                url: parsed.data.url?.trim(),
              },
            });
            return { success: true, image };
          } catch {
            req.set.status = 404;
            return { success: false, message: "Image not found" };
          }
        })
        .delete("/:id", async (req) => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            req.set.status = 400;
            return { success: false, message: "Invalid image ID" };
          }

          try {
            await prisma.images.delete({ where: { id } });
            return { success: true, message: "Image deleted successfully" };
          } catch {
            req.set.status = 409;
            return {
              success: false,
              message:
                "Unable to delete image. It may not exist or is currently in use",
            };
          }
        })
    );

    return router;
  }
}

export { ImagesRoutes };
