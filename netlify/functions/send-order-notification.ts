import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    OWNER_WHATSAPP: process.env.OWNER_WHATSAPP,
  };
}

function json(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function safeParse(body?: string | null) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

async function sendWhatsAppText(message: string) {
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
        text: { body: message },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function buildOwnerMessage(orderId: string, order: any) {
  const lines = [
    `✅ ORDER COMPLETED${orderId ? `: ${orderId}` : ""}`,
    order?.createdAt ? `Created: ${order.createdAt}` : "",
    ``,
    `Amount: R ${Number(order?.totals?.grandTotal || 0).toFixed(2)}`,
    `Courier: R ${Number(order?.totals?.courierFee || 0).toFixed(2)} (Total kg: ${Number(order?.totals?.totalKg || 0).toFixed(1)}kg)`,
    ``,
    `Customer: ${order?.customer?.firstName || ""} ${order?.customer?.lastName || ""}`.trim(),
    `Email: ${order?.customer?.email || ""}`,
    `Phone: ${order?.customer?.phone || ""}`,
    ``,
    `Address:`,
    `${order?.address?.line1 || ""}`,
    order?.address?.line2 ? `${order.address.line2}` : "",
    `${order?.address?.suburb || ""}, ${order?.address?.city || ""}`,
    `${order?.address?.province || ""}, ${order?.address?.postalCode || ""}`,
    ``,
    `Items:`,
    ...(Array.isArray(order?.items)
      ? order.items.map(
          (it: any) =>
            `- ${Number(it?.qty || 0)}x ${it?.name || "Item"} @ R ${Number(it?.price || 0).toFixed(2)} each`
        )
      : []),
  ];

  return lines.filter(Boolean).join("\n");
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

    const payload = safeParse(event.body);
    if (!payload) {
      return json(400, { error: "Invalid JSON" });
    }

    const orderId = String(payload.orderId || "").trim();
    const order = payload.order;

    if (!orderId) {
      return json(400, { error: "Missing orderId" });
    }

    if (!order || typeof order !== "object") {
      return json(400, { error: "Missing order snapshot" });
    }

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      }
    );

    const { data: dbOrder, error: dbErr } = await supabase
      .from("orders")
      .select("id, status, owner_notification_sent")
      .eq("id", orderId)
      .single();

    if (dbErr || !dbOrder) {
      return json(404, { error: "Order not found", details: dbErr });
    }

    if (dbOrder.owner_notification_sent) {
      return json(200, { ok: true, alreadySent: true });
    }

    // Temporary fallback:
    // We are trusting the success redirect until Yoco webhooks are approved.
    const message = buildOwnerMessage(orderId, order);
    const wa = await sendWhatsAppText(message);

    await supabase
      .from("orders")
      .update({
        owner_notification_sent: true,
        owner_notification_sent_at: new Date().toISOString(),
        status: dbOrder.status === "pending" ? "paid" : dbOrder.status,
      })
      .eq("id", orderId);

    return json(200, {
      ok: true,
      messageId: wa?.messages?.[0]?.id || null,
    });
  } catch (e: any) {
    return json(500, {
      error: e?.message || "Server error",
    });
  }
};