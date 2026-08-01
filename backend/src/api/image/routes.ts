import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";
import { requireAuth, requirePermission } from "../auth/permissions";
import sharp from "sharp";

async function optimizeImage(inputUrl: string): Promise<string> {
  if (inputUrl.startsWith("http://") || inputUrl.startsWith("https://")) {
    return inputUrl;
  }

  let base64Data = inputUrl;

  if (inputUrl.startsWith("data:")) {
    const commaIndex = inputUrl.indexOf(",");
    if (commaIndex !== -1) {
      base64Data = inputUrl.substring(commaIndex + 1);
    }
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const optimizedBase64 = optimizedBuffer.toString("base64");
    return `data:image/webp;base64,${optimizedBase64}`;
  } catch (error) {
    console.error("Failed to optimize image:", error);
    return inputUrl;
  }
}

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

          const optimizedUrl = await optimizeImage(parsed.data.url.trim());

          const image = await prisma.images.create({
            data: {
              url: optimizedUrl,
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
            let updatedUrl = parsed.data.url?.trim();
            if (updatedUrl) {
              updatedUrl = await optimizeImage(updatedUrl);
            }

            const image = await prisma.images.update({
              where: { id },
              data: {
                url: updatedUrl,
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
