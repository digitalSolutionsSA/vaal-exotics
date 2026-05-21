import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Match PHP urlencode() behaviour for signature verification
function pfEncode(val: string): string {
  return encodeURIComponent(val.trim())
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/~/g, "%7E")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function verifySignature(rawBody: string, passphrase: string): boolean {
  const params = new URLSearchParams(rawBody);
  const receivedSig = params.get("signature");
  if (!receivedSig) return false;

  const sigFields: [string, string][] = [];
  params.forEach((val, key) => {
    if (key !== "signature") sigFields.push([key, val]);
  });

  const paramString = sigFields
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");

  const withPass = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;

  const expectedSig = crypto.createHash("md5").update(withPass).digest("hex");
  return receivedSig === expectedSig;
}

async function validateWithPayFast(rawBody: string): Promise<boolean> {
  try {
    const res = await fetch(
      "https://www.payfast.co.za/eng/query/validate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": String(Buffer.byteLength(rawBody)),
        },
        body: rawBody,
      }
    );
    const text = await res.text();
    return text.trim() === "VALID";
  } catch (e) {
    console.error("[payfast-itn] PayFast validation request failed:", e);
    return false;
  }
}

function fmt(val: number): string {
  return `R${Number(val || 0).toFixed(2)}`;
}

function esc(val: string): string {
  return String(val || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendEmails(opts: {
  resendKey: string;
  reference: string;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: {
    line1: string;
    line2: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
  };
  items: { name: string; qty: number; price: number; lineTotal: number }[];
  totals: {
    itemsTotal: number;
    courierFee: number;
    totalKg: number;
    grandTotal: number;
  };
}) {
  const { resendKey, reference, customer, address, items, totals } = opts;
  const resend = new Resend(resendKey);
  const FROM = "Vaal Exotics <orders@vaalexotics.co.za>";
  const MANAGEMENT_EMAIL = "info@vaalexotics.co.za";
  const { firstName, lastName, email, phone } = customer;
  const { itemsTotal, courierFee, totalKg, grandTotal } = totals;

  const addressParts = [
    address.line1,
    address.line2,
    address.suburb,
    address.city,
    address.province,
    address.postalCode,
  ].filter(Boolean);
  const addressHtml = addressParts.map(esc).join("<br/>");
  const addressText = addressParts.join(", ") || "No address supplied";

  const itemRowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <strong>${esc(item.name)}</strong><br/>
          <span style="color:#6b7280;font-size:13px;">Qty: ${item.qty} &nbsp;|&nbsp; Unit price: ${fmt(item.price)}</span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;vertical-align:top;font-weight:600;">
          ${fmt(item.lineTotal)}
        </td>
      </tr>`
    )
    .join("");

  const itemsText = items
    .map((it) => `${it.qty}x ${it.name} — ${fmt(it.lineTotal)}`)
    .join("\n");

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

  const managementHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:680px;margin:0 auto;">
      <div style="background:#111827;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">VAAL EXOTICS</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">New order received — paid online via PayFast</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
        <h2 style="margin-top:0;">Order ${esc(reference)}</h2>
        <p style="display:inline-block;background:#d1fae5;color:#065f46;padding:4px 14px;border-radius:9999px;font-size:13px;font-weight:600;">
          ✅ Payment confirmed via PayFast
        </p>

        <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Customer Details</h3>
        <p style="margin:0;line-height:2.2;">
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

  const customerHtml = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:680px;margin:0 auto;">
      <div style="background:#111827;padding:24px 32px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:20px;letter-spacing:1px;">VAAL EXOTICS</h1>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Order confirmation</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:32px;">
        <h2 style="margin-top:0;">Thanks for your order, ${esc(firstName)}!</h2>
        <p style="color:#374151;">Your payment was received and your order is confirmed. We'll get it ready and be in touch soon.</p>
        <p><strong>Order Reference:</strong> ${esc(reference)}</p>

        <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Your Order</h3>
        ${table}
        ${totalsBlock}

        <h3 style="color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:24px;">Delivery Address</h3>
        <p style="margin:0;">${addressHtml || "No address supplied"}</p>

        <p style="margin-top:32px;color:#9ca3af;font-size:13px;border-top:1px solid #e5e7eb;padding-top:16px;">
          Questions? Contact us at
          <a href="mailto:${MANAGEMENT_EMAIL}" style="color:#92400e;">${MANAGEMENT_EMAIL}</a>
        </p>
      </div>
    </div>`;

  const [mgmtResult, custResult] = await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: [MANAGEMENT_EMAIL],
      replyTo: email,
      subject: `New Order (PayFast) — ${reference} | ${firstName} ${lastName}`,
      html: managementHtml,
      text: `New Order (PayFast — paid online): ${reference}\n\nCustomer: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone}\n\nAddress: ${addressText}\n\nItems:\n${itemsText}\n\n${totalsText}`,
    }),
    resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: MANAGEMENT_EMAIL,
      subject: `Your Vaal Exotics order is confirmed — ${reference}`,
      html: customerHtml,
      text: `Thanks for your order, ${firstName}!\n\nYour payment was received and your order is confirmed.\n\nOrder Reference: ${reference}\n\nItems:\n${itemsText}\n\n${totalsText}\n\nDelivery Address: ${addressText}\n\nQuestions? Email ${MANAGEMENT_EMAIL}`,
    }),
  ]);

  console.log(
    "[payfast-itn] management email:",
    mgmtResult.status === "fulfilled" ? "sent" : "failed",
    mgmtResult.status === "rejected" ? mgmtResult.reason : ""
  );
  console.log(
    "[payfast-itn] customer email:",
    custResult.status === "fulfilled" ? "sent" : "failed",
    custResult.status === "rejected" ? custResult.reason : ""
  );
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const env = {
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID ?? "",
    PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  };

  const rawBody = event.body || "";
  console.log("[payfast-itn] received body (first 500):", rawBody.slice(0, 500));

  // 1. Verify signature
  if (!verifySignature(rawBody, env.PAYFAST_PASSPHRASE)) {
    console.error("[payfast-itn] Signature verification failed");
    return { statusCode: 400, body: "Invalid signature" };
  }

  const params = new URLSearchParams(rawBody);
  const pfData: Record<string, string> = {};
  params.forEach((val, key) => {
    pfData[key] = val;
  });

  // 2. Verify merchant ID matches ours
  if (pfData.merchant_id !== env.PAYFAST_MERCHANT_ID) {
    console.error("[payfast-itn] Merchant ID mismatch:", pfData.merchant_id);
    return { statusCode: 400, body: "Invalid merchant" };
  }

  // 3. Validate with PayFast servers (server-to-server)
  const isValid = await validateWithPayFast(rawBody);
  if (!isValid) {
    console.error("[payfast-itn] PayFast server validation failed");
    return { statusCode: 400, body: "Validation failed" };
  }

  // 4. Only process COMPLETE payments
  const paymentStatus = pfData.payment_status;
  if (paymentStatus !== "COMPLETE") {
    console.log("[payfast-itn] Non-complete payment, status:", paymentStatus);
    return { statusCode: 200, body: "OK" };
  }

  const orderId = pfData.m_payment_id;
  const amountGross = parseFloat(pfData.amount_gross || "0");

  if (!orderId) {
    console.error("[payfast-itn] Missing m_payment_id");
    return { statusCode: 200, body: "OK" };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[payfast-itn] Supabase not configured");
    return { statusCode: 200, body: "OK" };
  }

  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  // Fetch order + items
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`id, status, amount_cents, order_items(name, qty, price_cents)`)
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    console.error("[payfast-itn] Order not found:", orderId, orderErr);
    return { statusCode: 200, body: "OK" };
  }

  // Idempotency guard
  if (order.status === "paid") {
    console.log("[payfast-itn] Already processed:", orderId);
    return { statusCode: 200, body: "OK" };
  }

  // 5. Verify amount matches what we charged
  const expectedAmount = order.amount_cents / 100;
  if (Math.abs(expectedAmount - amountGross) > 0.01) {
    console.error("[payfast-itn] Amount mismatch", {
      expected: expectedAmount,
      received: amountGross,
    });
    return { statusCode: 200, body: "OK" };
  }

  // Mark order as paid
  await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId);

  // Extract customer data from PayFast ITN fields
  const firstName = pfData.name_first || "";
  const lastName = pfData.name_last || "";
  const email = pfData.email_address || "";
  const phone = pfData.cell_number || "";

  // Parse compact address from custom_str1
  let address = {
    line1: "",
    line2: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
  };
  try {
    const compact = JSON.parse(pfData.custom_str1 || "{}");
    address = {
      line1: compact.l1 || "",
      line2: compact.l2 || "",
      suburb: compact.sb || "",
      city: compact.ct || "",
      province: compact.pv || "",
      postalCode: compact.pc || "",
    };
  } catch {
    console.warn("[payfast-itn] Failed to parse custom_str1 (address)");
  }

  // Parse compact extras from custom_str2
  let itemsTotal = 0;
  let courierFee = 0;
  let totalKg = 0;
  let reference = orderId;
  try {
    const extras = JSON.parse(pfData.custom_str2 || "{}");
    itemsTotal = parseFloat(extras.it || "0");
    courierFee = parseFloat(extras.cf || "0");
    totalKg = parseFloat(extras.tk || "0");
    reference = extras.ref || orderId;
  } catch {
    console.warn("[payfast-itn] Failed to parse custom_str2 (extras)");
  }

  // Build email items from Supabase order_items
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  const emailItems = orderItems.map((it: any) => {
    const qty = Number(it.qty || 1);
    const price = Number(it.price_cents || 0) / 100;
    return { name: String(it.name || "Item"), qty, price, lineTotal: qty * price };
  });

  // Send both emails
  if (env.RESEND_API_KEY && email) {
    try {
      await sendEmails({
        resendKey: env.RESEND_API_KEY,
        reference,
        customer: { firstName, lastName, email, phone },
        address,
        items: emailItems,
        totals: { itemsTotal, courierFee, totalKg, grandTotal: amountGross },
      });
    } catch (emailErr) {
      console.error("[payfast-itn] Email send failed:", emailErr);
    }
  }

  console.log("[payfast-itn] Order processed successfully:", orderId);
  return { statusCode: 200, body: "OK" };
};
