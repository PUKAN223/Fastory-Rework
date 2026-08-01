import { toast } from "sonner";
import type { Order } from "@/features/salesSlice";
import type { Store } from "@/features/storeSlice";

/**
 * Open print window for 80mm thermal receipt
 */
export function handlePrintReceipt(
  order: Order,
  store: Store | null | undefined,
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("กรุณาอนุญาตป๊อบอัปในเบราว์เซอร์เพื่อพิมพ์ใบเสร็จ");
    return;
  }

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px;">
      <span style="font-weight: 500;">${item.quantity}x ${item.productName}</span>
      <span style="font-weight: 600;">฿${Number(item.totalPrice).toLocaleString()}</span>
    </div>
  `,
    )
    .join("");

  const subtotalVal = Number(order.subtotal || order.total);
  const totalVal = Number(order.total);
  const discountVal = Number(order.discount || 0);
  const paymentText = order.paymentMethod === "cash" ? "เงินสด" : "PromptPay";

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ใบเสร็จรับเงิน #${order.orderNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace, 'Sarabun', sans-serif;
            width: 280px;
            margin: 0 auto;
            padding: 16px;
            color: #0f172a;
            background: #fff;
            font-size: 11px;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .header { text-align: center; margin-bottom: 12px; }
          .logo { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .info-pre { font-size: 11px; color: #475569; white-space: pre-wrap; margin-top: 2px; }
          .tax-id { font-size: 11px; font-weight: 700; color: #334155; margin-top: 4px; }
          .meta-box { border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 8px 0; margin-bottom: 12px; font-size: 11px; color: #475569; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .items-box { margin-bottom: 12px; }
          .divider-dashed { border-top: 1px dashed #cbd5e1; margin: 8px 0; }
          .divider-solid { border-top: 1px solid #0f172a; margin: 4px 0; }
          .totals-box { font-size: 11px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .total-row { font-size: 13px; font-weight: 800; color: #0f172a; padding-top: 4px; margin-top: 4px; border-top: 1px solid #0f172a; }
          .footer { margin-top: 14px; text-align: center; font-size: 11px; border-top: 1px dashed #cbd5e1; padding-top: 10px; color: #475569; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${store?.name || "ชื่อร้านค้า"}</div>
          ${store?.receiptHeader ? `<div class="info-pre">${store.receiptHeader}</div>` : ""}
          ${store?.receiptTaxId ? `<div class="tax-id">TAX ID: ${store.receiptTaxId}</div>` : ""}
        </div>

        <div class="meta-box">
          <div class="meta-row"><span>วันที่:</span> <span>${new Date(order.createdAt).toLocaleString("th-TH")}</span></div>
          <div class="meta-row"><span>พนักงาน:</span> <span>${order.creator?.username || store?.jobTitle || "Owner"}</span></div>
          <div class="meta-row"><span>เลขที่:</span> <span>#${order.orderNumber}</span></div>
        </div>

        <div class="items-box">
          ${itemsHtml}
        </div>

        <div class="divider-solid"></div>

        <div class="totals-box">
          ${
            discountVal > 0
              ? `
            <div class="row"><span>รวมเป็นเงิน</span> <span>฿${subtotalVal.toLocaleString()}</span></div>
            <div class="row" style="color: #dc2626;"><span>ส่วนลด</span> <span>-฿${discountVal.toLocaleString()}</span></div>
          `
              : ""
          }
          <div class="row total-row">
            <span>ยอดชำระสุทธิ</span>
            <span>฿${totalVal.toLocaleString()}</span>
          </div>
        </div>

        <div class="divider-dashed"></div>

        <div class="totals-box" style="color: #475569;">
          <div class="row"><span>รับเงิน (${paymentText})</span> <span>฿${Number(order.amountReceived ?? totalVal).toLocaleString()}</span></div>
          <div class="row" style="font-weight: 600;"><span>เงินทอน</span> <span>฿${Number(order.changeAmount ?? Number(order.amountReceived || totalVal) - totalVal).toLocaleString()}</span></div>
        </div>

        ${
          store?.receiptFooter
            ? `<div class="footer"><div class="info-pre">${store.receiptFooter}</div></div>`
            : `<div class="footer"><p style="margin:0;">ขอบคุณที่ใช้บริการ</p></div>`
        }

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}
