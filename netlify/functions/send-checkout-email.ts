import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Vaal Exotics <onboarding@resend.dev>";
const MANAGEMENT_EMAIL = "info@vaalexotics.co.za";

type OrderItem = {
  name?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  lineTotal?: number;
};

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function fmt(value: number): string {
  return `R${Number(value || 0).toFixed(2)}`;
}

function esc(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const handler = async (event: any) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!process.env.RESEND_API_KEY) return json(500, { error: "Missing RESEND_API_KEY" });

  try {
    const payload = JSON.parse(event.body || "{}");

    const reference = String(payload.reference || "").trim();
    const customer = payload.customer || {};
    const address = payload.address || {};
    const totals = payload.totals || {};
    const items: OrderItem[] = Array.isArray(payload.items) ? payload.items : [];

    const firstName = String(customer.firstName || "").trim();
    const lastName = String(customer.lastName || "").trim();
    const email = String(customer.email || payload.customerEmail || "").trim();
    const phone = String(customer.phone || "").trim();

    if (!reference) return json(400, { error: "Missing order reference" });
    if (!email) return json(400, { error: "Missing customer email" });
    if (!items.length) return json(400, { error: "No order items" });

    const itemsTotal = Number(totals.itemsTotal ?? 0);
    const courierFee = Number(totals.courierFee ?? 0);
    const totalKg = Number(totals.totalKg ?? 0);
    const grandTotal = Number(totals.grandTotal ?? itemsTotal + courierFee);

    const addressParts = [
      address.line1, address.line2, address.suburb,
      address.city, address.province, address.postalCode,
    ].filter(Boolean);
    const addressHtml = addressParts.map((p: string) => esc(p)).join("<br/>");
    const addressText = addressParts.join(", ") || "No address supplied";

    const itemRowsHtml = items.map((item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const price = Number(item.price ?? 0);
      const lineTotal = Number(item.lineTotal ?? qty * price);
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
            <strong>${esc(item.name || "Item")}</strong><br/>
            <span style="color:#6b7280;font-size:13px;">Qty: ${qty} &nbsp;|&nbsp; Unit price: ${fmt(price)}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-weight:600;">
            ${fmt(lineTotal)}
          </td>
        </tr>`;
    }).join("");

    const itemsText = items.map((item) => {
      const qty = Number(item.qty ?? item.quantity ?? 0);
      const price = Number(item.price ?? 0);
      const lineTotal = Number(item.lineTotal ?? qty * price);
      return `${qty}x ${item.name || "Item"} — ${fmt(lineTotal)}`;
    }).join("\n");

    const table = `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="text-align:left;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:13px;color:#374151;">Item</th>
            <th style="text-align:right;padding:10px 12px;border-bottom:2px solid #e5e7eb;font-size:13px;color:#374151;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml}</tbody>
      </table>`;

    const totalsBlock = `
      <table style="width:100%;margin-top:16px;">
        <tr><td style="padding:4px 0;color:#6b7280;">Products Total</td><td style="text-align:right;padding:4px 0;">${fmt(itemsTotal)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Courier Fee</td><td style="text-align:right;padding:4px 0;">${fmt(courierFee)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Total Weight</td><td style="text-align:right;padding:4px 0;">${totalKg}kg</td></tr>
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:10px 0 4px;font-weight:700;font-size:16px;">Grand Total</td>
          <td style="text-align:right;padding:10px 0 4px;font-weight:700;font-size:16px;">${fmt(grandTotal)}</td>
        </tr>
      </table>`;

    const totalsText = `Products Total: ${fmt(itemsTotal)}\nCourier Fee: ${fmt(courierFee)}\nTotal Weight: ${totalKg}kg\nGrand Total: ${fmt(grandTotal)}`;

    // ─── Management email ─────────────────────────────────────────────────────

    const managementHtml = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:680px;margin:0 auto;">
        <div style="background:#111827;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">VAAL EXOTICS</h1>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">New order received</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
          <h2 style="margin-top:0;">Order ${esc(reference)}</h2>

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Customer Details</h3>
          <p style="margin:0;line-height:2;">
            <strong>Name:</strong> ${esc(firstName)} ${esc(lastName)}<br/>
            <strong>Email:</strong> ${esc(email)}<br/>
            <strong>Phone:</strong> ${esc(phone)}
          </p>

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Delivery Address</h3>
          <p style="margin:0;">${addressHtml || "No address supplied"}</p>

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Items Ordered</h3>
          ${table}
          ${totalsBlock}
        </div>
      </div>`;

    // ─── Customer email ───────────────────────────────────────────────────────

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:680px;margin:0 auto;">
        <div style="background:#111827;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">VAAL EXOTICS</h1>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Order confirmation</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
          <h2 style="margin-top:0;">Thanks for your order, ${esc(firstName)}!</h2>
          <p style="color:#6b7280;">We've received your order. Please complete your EFT payment using the details below.</p>
          <p><strong>Order Reference:</strong> ${esc(reference)}</p>

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">EFT Payment Details</h3>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;line-height:2.2;">
            Please use your <strong>order number (${esc(reference)}) or full name</strong> as your payment reference.<br/>
            <strong>Bank:</strong> FNB<br/>
            <strong>Account Type:</strong> Gold Business Account<br/>
            <strong>Account Number:</strong> 63103139283<br/>
            <strong>Branch Code:</strong> 250655
          </div>

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Your Order</h3>
          ${table}
          ${totalsBlock}

          <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Delivery Address</h3>
          <p style="margin:0;">${addressHtml || "No address supplied"}</p>

          <p style="margin-top:32px;color:#9ca3af;font-size:13px;border-top:1px solid #e5e7eb;padding-top:16px;">
            Questions? Reply to this email or contact us at
            <a href="mailto:${MANAGEMENT_EMAIL}" style="color:#92400e;">${MANAGEMENT_EMAIL}</a>
          </p>
        </div>
      </div>`;

    // ─── Send both independently so one failure doesn't block the other ───────

    const [mgmtResult, custResult] = await Promise.allSettled([
      resend.emails.send({
        from: FROM,
        to: [MANAGEMENT_EMAIL],
        replyTo: email,
        subject: `New Order — ${reference} | ${firstName} ${lastName}`,
        html: managementHtml,
        text: `New Order: ${reference}\n\nCustomer: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\n\nAddress: ${addressText}\n\nItems:\n${itemsText}\n\n${totalsText}`,
      }),
      resend.emails.send({
        from: FROM,
        to: [email],
        replyTo: MANAGEMENT_EMAIL,
        subject: `Your Vaal Exotics order is confirmed — ${reference}`,
        html: customerHtml,
        text: `Thanks for your order, ${firstName}!\n\nOrder Reference: ${reference}\n\nEFT Payment Details:\nBank: FNB\nAccount Type: Gold Business Account\nAccount Number: 63103139283\nBranch Code: 250655\nReference: ${reference} or your full name\n\nItems:\n${itemsText}\n\n${totalsText}\n\nDelivery Address: ${addressText}`,
      }),
    ]);

    const mgmtOk = mgmtResult.status === "fulfilled" && !mgmtResult.value.error;
    const custOk = custResult.status === "fulfilled" && !custResult.value.error;

    console.log("[send-checkout-email] management:", mgmtOk ? "sent" : "failed", mgmtResult);
    console.log("[send-checkout-email] customer:", custOk ? "sent" : "failed", custResult);

    if (!custOk) {
      const err = custResult.status === "rejected" ? custResult.reason : (custResult.value as any).error;
      return json(500, { error: "Failed to send customer email", details: err });
    }

    return json(200, {
      ok: true,
      managementEmailSent: mgmtOk,
      customerEmailSent: custOk,
    });

  } catch (error: any) {
    console.error("[send-checkout-email] Unexpected error:", error);
    return json(500, { error: error?.message || "Something went wrong" });
  }
};
