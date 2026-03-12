import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOCO_WEBHOOK_SECRET: process.env.YOCO_WEBHOOK_SECRET,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    OWNER_WHATSAPP: process.env.OWNER_WHATSAPP,
  };
}

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function verifyYocoSignature(rawBody: string, signature?: string) {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

async function sendWhatsAppText(body: string) {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, OWNER_WHATSAPP } =
    getEnv();

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !OWNER_WHATSAPP) {
    throw new Error("Missing WhatsApp env vars");
  }

  const res = await fetch(
    `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: OWNER_WHATSAPP,
        type: "text",
        text: { body },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${JSON.stringify(data)}`);
  }

  return data;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const env = getEnv();

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing Supabase env vars" });
    }

    const rawBody = event.body || "";
    const signature =
      event.headers["webhook-signature"] ||
      event.headers["Webhook-Signature"];

    if (!verifyYocoSignature(rawBody, signature)) {
      return json(401, { error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody);

    // Adjust this if your exact Yoco event differs
    const eventType = payload?.type;
    if (eventType !== "payment.succeeded") {
      return json(200, { ok: true, ignored: true, eventType });
    }

    const orderId = payload?.payload?.metadata?.order_id;
    const yocoPaymentId = payload?.payload?.id ?? null;

    if (!orderId) {
      return json(400, { error: "Missing metadata.order_id" });
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        amount_cents,
        currency,
        customer_name,
        customer_email,
        customer_phone,
        paid_at,
        whatsapp_sent,
        whatsapp_sent_at,
        whatsapp_message_id,
        whatsapp_error,
        order_items (
          name,
          qty,
          price_cents
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return json(404, { error: "Order not found", details: orderErr });
    }

    // Idempotency guard
    if (order.status === "paid" && order.whatsapp_sent === true) {
      return json(200, { ok: true, alreadyProcessed: true });
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        yoco_payment_id: yocoPaymentId,
      })
      .eq("id", orderId);

    if (updateErr) {
      return json(500, { error: "Failed to update order", details: updateErr });
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const itemLines = items.length
      ? items
          .map((it: any) => {
            const qty = Number(it.qty || 0);
            const price = Number(it.price_cents || 0) / 100;
            return `- ${qty}x ${it.name || "Item"} @ R ${price.toFixed(2)} each`;
          })
          .join("\n")
      : "- No item lines found";

    const totalRand = Number(order.amount_cents || 0) / 100;

    const message =
`✅ ORDER COMPLETED

Order: ${order.id}
Amount: R ${totalRand.toFixed(2)}
Customer: ${order.customer_name || ""}
Email: ${order.customer_email || ""}
Phone: ${order.customer_phone || ""}

Items:
${itemLines}`;

    try {
      const wa = await sendWhatsAppText(message);

      await supabase
        .from("orders")
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_message_id: wa?.messages?.[0]?.id ?? null,
          whatsapp_error: null,
        })
        .eq("id", orderId);
    } catch (waErr: any) {
      await supabase
        .from("orders")
        .update({
          whatsapp_sent: false,
          whatsapp_error: waErr?.message || "WhatsApp send failed",
        })
        .eq("id", orderId);

      return json(500, {
        error: "Payment confirmed but WhatsApp send failed",
        details: waErr?.message || waErr,
      });
    }

    return json(200, { ok: true, orderId });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
};