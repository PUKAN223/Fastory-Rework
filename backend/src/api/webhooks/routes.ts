import BaseRouter from "../../class/BaseRouter";
import { prisma } from "../../db/client";
import { z } from "zod";

class WebhooksRoutes extends BaseRouter {
  public override getRouter() {
    const router = super.getRouter();

    // The endpoint matches /api/v1/webhooks/tmwallet
    router.post("/tmwallet", async (req) => {
      const webhookKey = process.env.WEBHOOK_API_KEY || "";

      // 1. Authenticate
      if (webhookKey) {
        let got = req.headers["x-webhook-key"];
        if (!got && req.headers.authorization) {
          got = req.headers.authorization.replace(/^Bearer\s+/i, "");
        }
        if (got !== webhookKey) {
          this.logger.warn("Webhook POST rejected: unauthorized");
          req.set.status = 401;
          return { error: "unauthorized" };
        }
      }

      // 2. Parse Payload
      let payload: any = req.body;
      if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
        try {
          payload = JSON.parse(req.body);
        } catch {
          payload = null;
        }
      }

      if (!payload || !payload.id_pay) {
        this.logger.warn("Webhook POST rejected: bad_payload");
        req.set.status = 400;
        return { error: "bad_payload" };
      }

      if (
        payload.webhook_status &&
        String(payload.webhook_status).toLowerCase() !== "ok"
      ) {
        this.logger.info(
          `Webhook POST ignored: webhook_status=${payload.webhook_status}`,
        );
        return { ok: false, reason: "webhook_status not ok" };
      }

      const idPay = String(payload.id_pay).trim();
      // TrueMoney/PromptPay webhook usually sends amount as a string/number (e.g. "100.12")
      const webhookAmountStr = payload.amount || payload.amount_check;
      if (!webhookAmountStr) {
        this.logger.warn("Webhook POST rejected: missing amount");
        req.set.status = 400;
        return { error: "missing_amount" };
      }

      const webhookAmount = Number(webhookAmountStr);

      // 3. Idempotency (Duplicate check)
      const existing = await prisma.orders.findFirst({
        where: { webhook_id_pay: idPay },
      });

      if (existing) {
        this.logger.info(`Duplicate webhook id_pay=${idPay}`);
        return { ok: true, duplicate: true };
      }

      // 4. Find matching pending order by promptpay_amount
      const pendingOrder = await prisma.orders.findFirst({
        where: {
          status: "pending",
          payment_method: "promptpay",
          promptpay_amount: webhookAmount,
        },
      });

      if (pendingOrder) {
        // Expiration check: 5 minutes
        if (
          Date.now() - new Date(pendingOrder.created_at).getTime() >
            5 * 60 * 1000
        ) {
          this.logger.warn(
            `Matched order ${pendingOrder.order_number} but it is EXPIRED (>5m). Voiding.`,
          );
          await prisma.orders.update({
            where: { id: pendingOrder.id },
            data: { status: "voided", voided_at: new Date() },
          });
          return { ok: false, reason: "order_expired" };
        }

        try {
          const updatedOrder = await prisma.$transaction(async (tx) => {
            const order = await tx.orders.update({
              where: { id: pendingOrder.id },
              data: {
                status: "completed",
                webhook_id_pay: idPay,
                amount_received: webhookAmount,
                change_amount: 0,
              },
            });
            return order;
          });

          this.logger.info(
            `MATCH id_pay=${idPay} amount=${webhookAmount} -> Order: ${updatedOrder.order_number}`,
          );
          return {
            ok: true,
            orderNo: updatedOrder.order_number,
          };
        } catch (e) {
          this.logger.error("Failed to complete order on webhook: " + e);
          req.set.status = 500;
          return { error: "internal_error" };
        }
      }

      this.logger.info(
        `Received id_pay=${idPay} amount=${webhookAmount} (unmatched pending order)`,
      );
      return { ok: true, unmatched: true };
    });

    // Dynamic per-phone PromptPay webhook endpoint: /api/v1/webhooks/promptpay/:phone
    router.post("/promptpay/:phone", async (req) => {
      const rawPhone = (req as any).params?.phone;
      if (!rawPhone) {
        req.set.status = 400;
        return { error: "missing_phone_parameter" };
      }

      // Normalize phone number (digits only, e.g., "081-234-5678" -> "0812345678")
      const phoneDigits = rawPhone.replace(/\D/g, "");

      // Optional Auth Check if WEBHOOK_API_KEY is configured
      const webhookKey = process.env.WEBHOOK_API_KEY || "";
      if (webhookKey) {
        let got = req.headers["x-webhook-key"];
        if (!got && req.headers.authorization) {
          got = req.headers.authorization.replace(/^Bearer\s+/i, "");
        }
        if (got && got !== webhookKey) {
          this.logger.warn(`PromptPay webhook rejected for ${phoneDigits}: unauthorized key`);
          req.set.status = 401;
          return { error: "unauthorized" };
        }
      }

      // Parse Payload flexibly
      let payload: any = req.body;
      if (typeof req.body === "string" && req.body.trim().startsWith("{")) {
        try {
          payload = JSON.parse(req.body);
        } catch {
          payload = null;
        }
      }

      if (!payload) {
        req.set.status = 400;
        return { error: "bad_payload" };
      }

      // Support flexible transaction ID keys: id_pay, transaction_id, txid, ref, id
      const idPay = String(
        payload.id_pay ||
          payload.transaction_id ||
          payload.txid ||
          payload.ref ||
          payload.id ||
          "",
      ).trim();

      // Support flexible amount keys: amount, amount_check, total, value
      const webhookAmountStr =
        payload.amount || payload.amount_check || payload.total || payload.value;

      if (!idPay || !webhookAmountStr) {
        this.logger.warn(
          `PromptPay webhook for ${phoneDigits} rejected: missing id_pay or amount`,
        );
        req.set.status = 400;
        return { error: "missing_id_pay_or_amount" };
      }

      const webhookAmount = Number(webhookAmountStr);
      if (isNaN(webhookAmount) || webhookAmount <= 0) {
        req.set.status = 400;
        return { error: "invalid_amount" };
      }

      // Find store(s) with matching promptpay_id
      const matchingStores = await prisma.stores.findMany({
        where: {
          OR: [
            { promptpay_id: rawPhone },
            { promptpay_id: phoneDigits },
          ],
        },
        select: { id: true, name: true, promptpay_id: true },
      });

      const storeIds = matchingStores.map((s) => s.id);

      // Idempotency / Duplicate transaction check
      const existing = await prisma.orders.findFirst({
        where: { webhook_id_pay: idPay },
      });

      if (existing) {
        this.logger.info(
          `Duplicate PromptPay webhook for ${phoneDigits} with id_pay=${idPay}`,
        );
        return { ok: true, duplicate: true, orderNo: existing.order_number };
      }

      // Find matching pending PromptPay order
      const pendingOrder = await prisma.orders.findFirst({
        where: {
          status: "pending",
          payment_method: "promptpay",
          promptpay_amount: webhookAmount,
          ...(storeIds.length > 0 ? { store_id: { in: storeIds } } : {}),
        },
        orderBy: { created_at: "desc" },
      });

      if (pendingOrder) {
        // Expiration check: 5 minutes
        if (
          Date.now() - new Date(pendingOrder.created_at).getTime() >
          5 * 60 * 1000
        ) {
          this.logger.warn(
            `Matched order ${pendingOrder.order_number} but it is EXPIRED (>5m). Voiding.`,
          );
          await prisma.orders.update({
            where: { id: pendingOrder.id },
            data: { status: "voided", voided_at: new Date() },
          });
          return { ok: false, reason: "order_expired" };
        }

        try {
          const updatedOrder = await prisma.orders.update({
            where: { id: pendingOrder.id },
            data: {
              status: "completed",
              webhook_id_pay: idPay,
              amount_received: webhookAmount,
              change_amount: 0,
            },
          });

          this.logger.info(
            `PromptPay webhook matched for phone=${phoneDigits} id_pay=${idPay} amount=${webhookAmount} -> Order: ${updatedOrder.order_number}`,
          );
          return {
            ok: true,
            orderNo: updatedOrder.order_number,
            storeId: updatedOrder.store_id,
          };
        } catch (e) {
          this.logger.error("Failed to complete order on PromptPay webhook: " + e);
          req.set.status = 500;
          return { error: "internal_error" };
        }
      }

      this.logger.info(
        `Received PromptPay webhook for phone=${phoneDigits} id_pay=${idPay} amount=${webhookAmount} (unmatched pending order)`,
      );
      return { ok: true, unmatched: true };
    });

    return router;
  }
}

export { WebhooksRoutes };
