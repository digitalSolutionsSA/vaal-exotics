// netlify/functions/create-checkout.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOCO_SECRET_KEY: process.env.YOCO_SECRET_KEY,
    URL: process.env.URL,
    DEPLOY_URL: process.env.DEPLOY_URL,
  };
}

function assertEnv() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOCO_SECRET_KEY } = getEnv();
  const missing: string[] = [];

  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!YOCO_SECRET_KEY) missing.push("YOCO_SECRET_KEY");

  return missing;
}

function decodeJwtRole(jwt?: string) {
  try {
    const parts = String(jwt || "").split(".");
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf8");
    const obj = JSON.parse(json);

    return obj?.role ?? null;
  } catch {
    return null;
  }
}

function extractProductId(raw: unknown) {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const productId = s.includes(":") ? s.split(":")[0] : s;

  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidLike.test(productId) ? productId : null;
}

function safeParse(body?: string | null) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
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

export const handler: Handler = async (event) => {
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

    const env = getEnv();
    const missingEnv = assertEnv();

    if (missingEnv.length > 0) {
      return json(500, {
        error: "Server misconfigured (missing env vars)",
        missingEnv,
      });
    }

    const supabase = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
      }
    );

    const payload = safeParse(event.body);
    if (!payload) {
      return json(400, { error: "Invalid JSON" });
    }

    const items = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.cartItems)
      ? payload.cartItems
      : [];

    const amountCents = Number(payload.amountCents ?? payload.amount_cents);
    const currency = String(payload.currency || "ZAR").toUpperCase();
    const customer = payload.customer ?? null;

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json(400, { error: "Missing/invalid amountCents" });
    }

    if (!items.length) {
      return json(400, { error: "Missing items" });
    }

    const jwtRole = decodeJwtRole(env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        status: "pending",
        currency,
        amount_cents: amountCents,
        customer_email: customer?.email ?? null,
        customer_name: customer?.name ?? null,
        customer_phone: customer?.phone ?? null,
      })
      .select("id")
      .single();

    if (orderErr || !order?.id) {
      return json(500, {
        error: "Order insert failed",
        details: orderErr,
        debug: { jwtRole },
      });
    }

    const orderId = order.id;

    const orderItems = items.map((it: any) => ({
      order_id: orderId,
      product_id: extractProductId(it.product_id ?? it.id),
      name: it.name ?? null,
      qty: Number(it.qty ?? 1),
      price_cents: Number(it.price_cents ?? it.priceCents ?? 0),
    }));

    const invalid = orderItems.find(
      (x) =>
        !x.product_id ||
        !Number.isFinite(x.qty) ||
        x.qty <= 0 ||
        !Number.isFinite(x.price_cents) ||
        x.price_cents < 0
    );

    if (invalid) {
      await supabase.from("orders").delete().eq("id", orderId);

      return json(400, {
        error:
          "Invalid cart item. Expected valid product UUID, positive qty, and valid price_cents.",
        debug: { jwtRole, badItem: invalid },
      });
    }

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      await supabase.from("orders").delete().eq("id", orderId);

      return json(500, {
        error: "Order items insert failed",
        details: itemsErr,
        debug: { jwtRole },
      });
    }

    const baseUrl = env.URL || env.DEPLOY_URL || "http://localhost:8888";
    const successUrl = `${baseUrl}/checkout/success?order_id=${orderId}`;
    const cancelUrl = `${baseUrl}/checkout/cancel?order_id=${orderId}`;

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents,
        currency,
        successUrl,
        cancelUrl,
        metadata: { order_id: orderId },
      }),
    });

    let yocoJson: any = null;
    try {
      yocoJson = await yocoRes.json();
    } catch {
      yocoJson = null;
    }

    if (!yocoRes.ok) {
      await supabase
        .from("orders")
        .update({ status: "checkout_create_failed" })
        .eq("id", orderId);

      return json(500, {
        error: "Yoco checkout failed",
        details: yocoJson,
        debug: { jwtRole },
      });
    }

    await supabase
      .from("orders")
      .update({
        yoco_checkout_id: yocoJson?.id ?? null,
        yoco_checkout_url: yocoJson?.redirectUrl ?? null,
      })
      .eq("id", orderId);

    return json(200, {
      orderId,
      redirectUrl: yocoJson?.redirectUrl ?? null,
    });
  } catch (e: any) {
    return json(500, {
      error: e?.message || "Server error",
    });
  }
};