import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type OrderItem = {
  name?: string;
  quantity?: number;
  qty?: number;
  weightKg?: number;
  weight?: number;
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

function formatMoney(value: number): string {
  return `R${Number(value || 0).toFixed(2)}`;
}

function formatWeight(value?: number): string {
  return `${Number(value || 0).toFixed(2)}kg`;
}

function escapeHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const handler = async (event: any) => {
  try {
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

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    if (!process.env.RESEND_API_KEY) {
      return json(500, { error: "Missing RESEND_API_KEY" });
    }

    const payload = JSON.parse(event.body || "{}");

    const reference = String(
      payload.reference || payload.orderRef || payload.orderReference || ""
    ).trim();

    const customer = payload.customer || {};
    const address = payload.address || {};
    const totals = payload.totals || {};
    const items: OrderItem[] = Array.isArray(payload.items) ? payload.items : [];

    const firstName = String(customer.firstName || payload.firstName || "").trim();
    const lastName = String(customer.lastName || payload.lastName || "").trim();
    const email = String(customer.email || payload.email || "").trim();
    const phone = String(customer.phone || payload.phone || "").trim();

    if (!reference) {
      return json(400, { error: "Missing order reference" });
    }

    if (!email) {
      return json(400, { error: "Missing customer email" });
    }

    if (items.length === 0) {
      return json(400, { error: "No order items supplied" });
    }

    const itemsTotal = Number(
      totals.itemsTotal ?? totals.subtotal ?? payload.itemsTotal ?? payload.subtotal ?? 0
    );

    const courierFee = Number(
      totals.courierFee ?? totals.deliveryFee ?? totals.courier ?? payload.courierFee ?? payload.deliveryFee ?? 0
    );

    const totalKg = Number(totals.totalKg ?? payload.totalKg ?? 0);

    const grandTotal = Number(
      totals.grandTotal ?? totals.total ?? payload.grandTotal ?? payload.total ?? itemsTotal + courierFee
    );

    const courierName = String(
      totals.courierName || payload.courierName || payload.courierOption || "Courier"
    ).trim();

    const courierRateLabel = String(
      totals.courierRateLabel || payload.courierRateLabel || ""
    ).trim();

    const addressParts = [
      address.line1,
      address.line2,
      address.suburb,
      address.city,
      address.province,
      address.postalCode,
    ].filter(Boolean);

    const addressHtml = addressParts.length
      ? addressParts.map((part: string) => escapeHtml(part)).join("<br/>")
      : "No address supplied";

    const addressText = addressParts.length
      ? addressParts.join(", ")
      : "No address supplied";

    const itemsRowsHtml = items
      .map((item) => {
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const name = escapeHtml(item.name || "Item");
        const price = Number(item.price ?? 0);
        const weightKg = Number(item.weightKg ?? item.weight ?? 0);
        const lineTotal = Number(item.lineTotal ?? qty * price);

        return `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
              <strong>${name}</strong><br/>
              Qty: ${qty}
              ${weightKg ? `<br/>Weight: ${formatWeight(weightKg)} each` : ""}
              ${price ? `<br/>Unit Price: ${formatMoney(price)}` : ""}
            </td>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;">
              ${formatMoney(lineTotal)}
            </td>
          </tr>
        `;
      })
      .join("");

    const itemsText = items
      .map((item) => {
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const name = item.name || "Item";
        const price = Number(item.price ?? 0);
        const weightKg = Number(item.weightKg ?? item.weight ?? 0);
        const lineTotal = Number(item.lineTotal ?? qty * price);

        return [
          `${qty}x ${name}`,
          weightKg ? `Weight: ${formatWeight(weightKg)} each` : "",
          price ? `Unit Price: ${formatMoney(price)}` : "",
          `Line Total: ${formatMoney(lineTotal)}`,
        ]
          .filter(Boolean)
          .join(" | ");
      })
      .join("\n");

    // ─── Shared HTML blocks ───────────────────────────────────────────────────

    const totalsBlockHtml = `
      <p>
        <strong>Products Total:</strong> ${formatMoney(itemsTotal)}<br/>
        <strong>${escapeHtml(courierName)} Fee:</strong> ${formatMoney(courierFee)}<br/>
        ${courierRateLabel ? `<strong>Courier Rate:</strong> ${escapeHtml(courierRateLabel)}<br/>` : ""}
        <strong>Total Weight:</strong> ${formatWeight(totalKg)}<br/>
        <strong>Total Payable:</strong> ${formatMoney(grandTotal)}
      </p>
    `;

    const totalsBlockText = `
Products Total: ${formatMoney(itemsTotal)}
${courierName} Fee: ${formatMoney(courierFee)}
${courierRateLabel ? `Courier Rate: ${courierRateLabel}\n` : ""}Total Weight: ${formatWeight(totalKg)}
Total Payable: ${formatMoney(grandTotal)}
    `.trim();

    const itemsTableHtml = `
      <table style="width:100%; border-collapse:collapse; margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:10px; border-bottom:2px solid #d1d5db;">Item</th>
            <th style="text-align:right; padding:10px; border-bottom:2px solid #d1d5db;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRowsHtml}
        </tbody>
      </table>
    `;

    // ─── Management email ─────────────────────────────────────────────────────

    const managementSubject = `New Order Received - ${reference}`;

    const managementHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif; color:#111827; line-height:1.5; max-width:700px; margin:0 auto;">
        <h2 style="margin-bottom:8px;">New Order Received</h2>
        <p style="margin-top:0;"><strong>Order Reference:</strong> ${escapeHtml(reference)}</p>

        <h3 style="margin-top:24px;">Customer Details</h3>
        <p>
          <strong>Name:</strong> ${escapeHtml(firstName)} ${escapeHtml(lastName)}<br/>
          <strong>Email:</strong> ${escapeHtml(email)}<br/>
          <strong>Phone:</strong> ${escapeHtml(phone)}
        </p>

        <h3 style="margin-top:24px;">Delivery Address</h3>
        <p>${addressHtml}</p>

        <h3 style="margin-top:24px;">Products Ordered</h3>
        ${itemsTableHtml}

        <h3 style="margin-top:24px;">Courier & Totals</h3>
        ${totalsBlockHtml}
      </div>
    `;

    const managementText = `
New Order Received

Order Reference: ${reference}

Customer Details
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}

Delivery Address
${addressText}

Products Ordered
${itemsText}

Courier & Totals
${totalsBlockText}
    `.trim();

    // ─── Customer confirmation email ──────────────────────────────────────────

    const customerSubject = `Your Vaal Exotics order is confirmed — ${reference}`;

    const customerHtml = `
      <div style="font-family:Arial,Helvetica,sans-serif; color:#111827; line-height:1.5; max-width:700px; margin:0 auto;">
        <h2 style="margin-bottom:8px;">Thanks for your order, ${escapeHtml(firstName)}!</h2>
        <p style="margin-top:0;">
          We've received your order. Please complete payment via EFT using the details below.
        </p>
        <p><strong>Order Reference:</strong> ${escapeHtml(reference)}</p>

        <h3 style="margin-top:24px;">EFT Payment Details</h3>
        <p style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; line-height:2;">
          Please use your <strong>order number (${escapeHtml(reference)}) or full name</strong> as your payment reference.<br/>
          <strong>Bank:</strong> FNB<br/>
          <strong>Account Type:</strong> Gold Business Account<br/>
          <strong>Account Number:</strong> 63103139283<br/>
          <strong>Branch Code:</strong> 250655
        </p>

        <h3 style="margin-top:24px;">Your Order</h3>
        ${itemsTableHtml}

        <h3 style="margin-top:24px;">Totals</h3>
        ${totalsBlockHtml}

        <h3 style="margin-top:24px;">Delivery Address</h3>
        <p>${addressHtml}</p>

        <p style="margin-top:32px; color:#6b7280; font-size:13px;">
          If you have any questions, reply to this email or contact us at
          <a href="mailto:info@vaalexotics.co.za" style="color:#a45512;">info@vaalexotics.co.za</a>.
        </p>
      </div>
    `;

    const customerText = `
Thanks for your order, ${firstName}!

We've received your order. Please complete payment via EFT using the details below.

Order Reference: ${reference}

EFT Payment Details
Please use your order number (${reference}) or full name as your payment reference.
Bank: FNB
Account Type: Gold Business Account
Account Number: 63103139283
Branch Code: 250655

Your Order
${itemsText}

Totals
${totalsBlockText}

Delivery Address
${addressText}

If you have any questions, contact us at info@vaalexotics.co.za.
    `.trim();

    // ─── Send both emails ─────────────────────────────────────────────────────

    const [managementResult, customerResult] = await Promise.all([
      resend.emails.send({
        from: "Vaal Exotics <onboarding@resend.dev>",
        to: ["info@vaalexotics.co.za"],
        replyTo: email,
        subject: managementSubject,
        html: managementHtml,
        text: managementText,
      }),
      resend.emails.send({
        from: "Vaal Exotics <onboarding@resend.dev>",
        to: [email],
        replyTo: "info@vaalexotics.co.za",
        subject: customerSubject,
        html: customerHtml,
        text: customerText,
      }),
    ]);

    if (managementResult.error) {
      console.error("[send-checkout-email] Management email error:", managementResult.error);
      return json(500, {
        error: "Failed to send management email",
        details: managementResult.error,
      });
    }

    if (customerResult.error) {
      console.error("[send-checkout-email] Customer confirmation email error:", customerResult.error);
    }

    console.log("[send-checkout-email] Emails sent:", {
      management: managementResult.data,
      customer: customerResult.data,
    });

    return json(200, {
      ok: true,
      message: "Checkout emails sent successfully",
      data: {
        management: managementResult.data,
        customer: customerResult.data,
      },
    });
  } catch (error: any) {
    console.error("[send-checkout-email] Unexpected error:", error);

    return json(500, {
      error: error?.message || "Something went wrong sending the email",
    });
  }
};