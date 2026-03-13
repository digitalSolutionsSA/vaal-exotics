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

function toWhatsAppDigits(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  let digits = raw.replace(/\D/g, "");

  // South Africa local format: 0xxxxxxxxx -> 27xxxxxxxxx
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `27${digits.slice(1)}`;
  }

  return digits;
}

function redactToken(token?: string | null) {
  const value = String(token || "");
  if (!value) return "";
  if (value.length <= 10) return "***redacted***";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function sendWhatsAppTemplate() {
  const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, OWNER_WHATSAPP } =
    getEnv();

  const ownerTo = toWhatsAppDigits(OWNER_WHATSAPP);

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !ownerTo) {
    throw new Error("Missing WhatsApp env vars");
  }

  const url = `https://graph.facebook.com/v22.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  // Temporary working template.
  // Replace "hello_world" later with your own approved template.
  const payload = {
    messaging_product: "whatsapp",
    to: ownerTo,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" },
    },
  };

  console.log("[send-order-notification] WhatsApp config:", {
    hasAccessToken: Boolean(WHATSAPP_ACCESS_TOKEN),
    accessTokenPreview: redactToken(WHATSAPP_ACCESS_TOKEN),
    phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
    ownerWhatsAppRaw: OWNER_WHATSAPP || "",
    ownerWhatsAppSanitized: ownerTo,
  });

  console.log(
    "[send-order-notification] WhatsApp template payload:",
    JSON.stringify(payload, null, 2)
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();

  console.log("[send-order-notification] WhatsApp API response:", {
    status: res.status,
    ok: res.ok,
    body: rawText,
  });

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { raw: rawText };
  }

  if (!res.ok) {
    const apiMessage =
      data?.error?.message ||
      data?.message ||
      rawText ||
      "Unknown WhatsApp API error";

    const err = new Error(`WhatsApp send failed: ${apiMessage}`);
    (err as any).details = data;
    (err as any).status = res.status;
    throw err;
  }

  return {
    data,
    rawText,
    sentTo: ownerTo,
    messageId: data?.messages?.[0]?.id || null,
  };
}

function buildOwnerMessage(orderId: string, order: any) {
  const firstName = String(order?.customer?.firstName || "").trim();
  const lastName = String(order?.customer?.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const lines = [
    `✅ ORDER COMPLETED${orderId ? `: ${orderId}` : ""}`,
    order?.createdAt ? `Created: ${order.createdAt}` : "",
    "",
    `Amount: R ${Number(order?.totals?.grandTotal || 0).toFixed(2)}`,
    `Courier: R ${Number(order?.totals?.courierFee || 0).toFixed(2)} (Total kg: ${Number(order?.totals?.totalKg || 0).toFixed(1)}kg)`,
    "",
    `Customer: ${fullName || "N/A"}`,
    `Email: ${order?.customer?.email || ""}`,
    `Phone: ${order?.customer?.phone || ""}`,
    "",
    `Address:`,
    `${order?.address?.line1 || ""}`,
    order?.address?.line2 ? `${order.address.line2}` : "",
    `${order?.address?.suburb || ""}, ${order?.address?.city || ""}`,
    `${order?.address?.province || ""}, ${order?.address?.postalCode || ""}`,
    "",
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
    console.log("[send-order-notification] Incoming request:", {
      method: event.httpMethod,
      path: event.path,
    });

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const env = getEnv();

    console.log("[send-order-notification] Env check:", {
      hasSupabaseUrl: Boolean(env.SUPABASE_URL),
      hasServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      hasWhatsappToken: Boolean(env.WHATSAPP_ACCESS_TOKEN),
      hasWhatsappPhoneNumberId: Boolean(env.WHATSAPP_PHONE_NUMBER_ID),
      ownerWhatsappRaw: env.OWNER_WHATSAPP || "",
      ownerWhatsappSanitized: toWhatsAppDigits(env.OWNER_WHATSAPP),
    });

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { error: "Missing Supabase env vars" });
    }

    if (
      !env.WHATSAPP_ACCESS_TOKEN ||
      !env.WHATSAPP_PHONE_NUMBER_ID ||
      !env.OWNER_WHATSAPP
    ) {
      return json(500, { error: "Missing WhatsApp env vars" });
    }

    const payload = safeParse(event.body);
    if (!payload) {
      return json(400, { error: "Invalid JSON" });
    }

    console.log(
      "[send-order-notification] Parsed payload:",
      JSON.stringify(payload, null, 2)
    );

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

    const { data: existingOrder, error: existingErr } = await supabase
      .from("orders")
      .select("id, status, owner_notification_sent, owner_notification_sent_at")
      .eq("id", orderId)
      .single();

    console.log("[send-order-notification] Existing order lookup:", {
      orderId,
      existingOrder,
      existingErr: existingErr ? existingErr.message || existingErr : null,
    });

    if (existingErr || !existingOrder) {
      return json(404, {
        error: "Order not found",
        details: existingErr?.message || existingErr || null,
      });
    }

    if (existingOrder.owner_notification_sent) {
      console.log("[send-order-notification] Notification already marked sent", {
        orderId,
        sentTo: toWhatsAppDigits(env.OWNER_WHATSAPP),
        sentAt: existingOrder.owner_notification_sent_at || null,
      });

      return json(200, {
        ok: true,
        alreadySent: true,
        sentTo: toWhatsAppDigits(env.OWNER_WHATSAPP),
        sentAt: existingOrder.owner_notification_sent_at || null,
      });
    }

    const sentAt = new Date().toISOString();

    const { data: claimedRows, error: claimErr } = await supabase
      .from("orders")
      .update({
        owner_notification_sent: true,
        owner_notification_sent_at: sentAt,
        status:
          existingOrder.status === "pending"
            ? "paid"
            : existingOrder.status,
      })
      .eq("id", orderId)
      .eq("owner_notification_sent", false)
      .select("id, status, owner_notification_sent, owner_notification_sent_at");

    console.log("[send-order-notification] Claim result:", {
      orderId,
      claimedRows,
      claimErr: claimErr ? claimErr.message || claimErr : null,
    });

    if (claimErr) {
      return json(500, {
        error: "Failed to claim owner notification",
        details: claimErr.message || claimErr,
      });
    }

    if (!claimedRows || claimedRows.length === 0) {
      return json(200, {
        ok: true,
        alreadySent: true,
        skipped: true,
        sentTo: toWhatsAppDigits(env.OWNER_WHATSAPP),
      });
    }

    const messagePreview = buildOwnerMessage(orderId, order);
    console.log(
      "[send-order-notification] Order message preview (not sent directly because template is used):\n" +
        messagePreview
    );

    try {
      const wa = await sendWhatsAppTemplate();

      console.log("[send-order-notification] WhatsApp accepted template:", {
        orderId,
        sentTo: wa.sentTo,
        messageId: wa.messageId,
        rawResponse: wa.rawText,
      });

      return json(200, {
        ok: true,
        sentTo: wa.sentTo,
        messageId: wa.messageId,
        sentAt,
        templateUsed: "hello_world",
        whatsappResponse: wa.data || null,
      });
    } catch (waErr: any) {
      console.error(
        "[send-order-notification] WhatsApp template send failed after claim:",
        {
          message: waErr?.message || "Unknown error",
          status: waErr?.status || null,
          details: waErr?.details || null,
        }
      );

      await supabase
        .from("orders")
        .update({
          owner_notification_sent: false,
          owner_notification_sent_at: null,
        })
        .eq("id", orderId);

      return json(500, {
        error: waErr?.message || "WhatsApp send failed",
        details: waErr?.details || null,
        status: waErr?.status || null,
      });
    }
  } catch (e: any) {
    console.error("[send-order-notification] ERROR:", {
      message: e?.message || "Server error",
      status: e?.status || null,
      details: e?.details || null,
    });

    return json(500, {
      error: e?.message || "Server error",
      details: e?.details || null,
      status: e?.status || null,
    });
  }
};