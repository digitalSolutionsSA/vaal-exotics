import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatZAR(value: number) {
  const n = Number(value || 0);
  return `R ${n.toFixed(2)}`;
}

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          Allow: "POST, OPTIONS",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    if (!process.env.RESEND_API_KEY) {
      return json(500, { error: "Missing RESEND_API_KEY" });
    }

    if (!process.env.MAILING_LIST_TO_EMAIL) {
      return json(500, { error: "Missing MAILING_LIST_TO_EMAIL" });
    }

    const payload = JSON.parse(event.body || "{}");

    const reference = String(payload.reference || "").trim();
    const customer = payload.customer || {};
    const address = payload.address || {};
    const totals = payload.totals || {};
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!reference || !customer.email || !customer.firstName || !customer.lastName) {
      return json(400, { error: "Missing required order details" });
    }

    const itemLinesHtml = items
      .map((it: any) => {
        const qty = Number(it.qty || 0);
        const name = escapeHtml(it.name || "Item");
        const lineTotal = Number(it.lineTotal || 0);

        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${qty}x ${name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatZAR(lineTotal)}</td>
        </tr>`;
      })
      .join("");

    const addressHtml = [
      address.line1,
      address.line2,
      address.suburb,
      address.city,
      address.province,
      address.postalCode,
    ]
      .filter(Boolean)
      .map((x: string) => escapeHtml(x))
      .join("<br/>");

    const subject = `New EFT order request - ${reference}`;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
        <h2 style="margin-bottom:8px;">New EFT Order Request</h2>
        <p style="margin-top:0;"><strong>Reference:</strong> ${escapeHtml(reference)}</p>

        <h3>Customer details</h3>
        <p>
          <strong>Name:</strong> ${escapeHtml(customer.firstName)} ${escapeHtml(customer.lastName)}<br/>
          <strong>Email:</strong> ${escapeHtml(customer.email)}<br/>
          <strong>Phone:</strong> ${escapeHtml(customer.phone || "")}
        </p>

        <h3>Delivery address</h3>
        <p>${addressHtml}</p>

        <h3>Order details</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="padding:8px 12px;border-bottom:2px solid #d1d5db;text-align:left;">Item</th>
              <th style="padding:8px 12px;border-bottom:2px solid #d1d5db;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemLinesHtml}
          </tbody>
        </table>

        <h3>Totals</h3>
        <p>
          <strong>Items total:</strong> ${formatZAR(Number(totals.itemsTotal || 0))}<br/>
          <strong>Courier:</strong> ${formatZAR(Number(totals.courierFee || 0))}<br/>
          <strong>Total kg:</strong> ${Number(totals.totalKg || 0).toFixed(1)}kg<br/>
          <strong>Grand total:</strong> ${formatZAR(Number(totals.grandTotal || 0))}
        </p>

        <p>Please reply to the customer with EFT banking details / payment instructions.</p>
      </div>
    `;

    const text = `
New EFT Order Request

Reference: ${reference}

Customer details
Name: ${customer.firstName} ${customer.lastName}
Email: ${customer.email}
Phone: ${customer.phone || ""}

Delivery address
${address.line1 || ""}
${address.line2 || ""}
${address.suburb || ""}
${address.city || ""}
${address.province || ""}
${address.postalCode || ""}

Order details
${items
  .map((it: any) => `${it.qty}x ${it.name} - ${formatZAR(Number(it.lineTotal || 0))}`)
  .join("\n")}

Totals
Items total: ${formatZAR(Number(totals.itemsTotal || 0))}
Courier: ${formatZAR(Number(totals.courierFee || 0))}
Total kg: ${Number(totals.totalKg || 0).toFixed(1)}kg
Grand total: ${formatZAR(Number(totals.grandTotal || 0))}

Please reply to the customer with EFT banking details / payment instructions.
    `.trim();

    const result = await resend.emails.send({
  from: "Vaal Exotics <onboarding@resend.dev>",
  to: process.env.MAILING_LIST_TO_EMAIL,
  cc: customer.email, // customer also gets a copy
  replyTo: customer.email,
  subject,
  html,
  text,
});

    return json(200, {
      ok: true,
      id: result.data?.id || null,
    });
  } catch (e: any) {
    console.error("[send-checkout-email] error:", e);
    return json(500, {
      error: e?.message || "Failed to send email",
    });
  }
};