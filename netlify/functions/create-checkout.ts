// netlify/functions/create-checkout.ts
import type { Handler } from "@netlify/functions";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

function getEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    YOCO_SECRET_KEY: process.env.YOCO_SECRET_KEY,
    APP_URL: process.env.APP_URL,
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

function detectSupabaseKeyType(key?: string) {
  const s = String(key || "").trim();

  if (!s) return "missing";
  if (s.startsWith("sb_secret_")) return "secret";
  if (s.startsWith("sb_publishable_")) return "publishable";
  if (s.split(".").length >= 3) return "legacy-jwt";

  return "unknown";
}

function getSupabaseKeyDebug(key?: string) {
  const raw = String(key || "").trim();
  const keyType = detectSupabaseKeyType(raw);
  const jwtRole = keyType === "legacy-jwt" ? decodeJwtRole(raw) : null;

  return {
    keyType,
    jwtRole,
    keyPrefix: raw ? `${raw.slice(0, 16)}...` : null,
    looksWrongForServer:
      keyType === "publishable" || keyType === "missing" || keyType === "unknown",
  };
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getBaseUrl() {
  const { APP_URL, URL, DEPLOY_URL } = getEnv();

  let baseUrl = String(APP_URL || URL || DEPLOY_URL || "http://localhost:8888").trim();
  baseUrl = baseUrl.replace(/\/+$/, "");

  if (
    baseUrl.startsWith("https://localhost") ||
    baseUrl.startsWith("https://127.0.0.1")
  ) {
    baseUrl = baseUrl.replace(/^https:/i, "http:");
  }

  return baseUrl;
}

function getCheckoutRedirectUrl(yocoJson: any) {
  return yocoJson?.redirectUrl ?? yocoJson?.redirect_url ?? yocoJson?.url ?? null;
}

function buildCustomerName(customer: any) {
  if (!customer) return null;

  const explicitName = String(customer.name ?? "").trim();
  if (explicitName) return explicitName;

  const combined = [customer.firstName, customer.lastName]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return combined || null;
}

function normalizeItems(payload: any) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.cartItems)) return payload.cartItems;
  return [];
}

function normalizeAmountCents(payload: any) {
  const raw = payload?.amountCents ?? payload?.amount_cents;
  return Number(raw);
}

function cleanSupabaseError(error: any) {
  if (!error) return null;

  return {
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    code: error.code ?? null,
  };
}

async function safeOrderStatusUpdate(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase.from("orders").update(patch).eq("id", orderId);

  if (!error) {
    return { ok: true, error: null };
  }

  console.error("[create-checkout] order update failed:", cleanSupabaseError(error), patch);
  return { ok: false, error };
}

async function safeCheckoutCreatedUpdate(
  supabase: ReturnType<typeof createClient>,
  orderId: string
) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "checkout_created",
    })
    .eq("id", orderId);

  if (error) {
    console.error(
      "[create-checkout] checkout_created status update failed:",
      cleanSupabaseError(error)
    );
  }
}

function isSpecialChargeItem(it: any) {
  const rawIds = [
    String(it?.id ?? "").trim().toLowerCase(),
    String(it?.productId ?? "").trim().toLowerCase(),
    String(it?.product_id ?? "").trim().toLowerCase(),
  ];

  if (
    rawIds.includes("shipping") ||
    rawIds.includes("courier") ||
    rawIds.includes("delivery")
  ) {
    return true;
  }

  const name = String(it?.name ?? "").trim().toLowerCase();
  return /shipping|courier|delivery/.test(name);
}

function normalizeCheckoutItem(it: any) {
  const quantity = Number(it?.qty ?? it?.quantity ?? 1);
  const priceCents = Number(
    it?.price_cents ??
      it?.priceCents ??
      (Number(it?.price ?? 0) > 0 ? Math.round(Number(it.price) * 100) : 0)
  );

  return {
    raw: it,
    isSpecialCharge: isSpecialChargeItem(it),
    product_id: extractProductId(it?.product_id ?? it?.productId ?? it?.id),
    name: String(it?.name ?? "Product"),
    quantity,
    price_cents: priceCents,
    total_cents: quantity * priceCents,
  };
}

export const handler: Handler = async (event) => {
  let orderId: string | null = null;

  try {
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: {
          Allow: "POST, OPTIONS",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const env = getEnv();
    const missingEnv = assertEnv();
    const supabaseKeyDebug = getSupabaseKeyDebug(env.SUPABASE_SERVICE_ROLE_KEY);

    console.log("[create-checkout] env present:", {
      hasSupabaseUrl: !!env.SUPABASE_URL,
      hasServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY,
      hasYocoSecret: !!env.YOCO_SECRET_KEY,
      appUrl: env.APP_URL || null,
      url: env.URL || null,
      deployUrl: env.DEPLOY_URL || null,
      supabaseKeyType: supabaseKeyDebug.keyType,
      supabaseKeyPrefix: supabaseKeyDebug.keyPrefix,
      supabaseJwtRole: supabaseKeyDebug.jwtRole,
      looksWrongForServer: supabaseKeyDebug.looksWrongForServer,
    });

    if (missingEnv.length > 0) {
      return json(500, {
        error: "Server misconfigured (missing env vars)",
        missingEnv,
      });
    }

    if (supabaseKeyDebug.looksWrongForServer) {
      return json(500, {
        error: "SUPABASE_SERVICE_ROLE_KEY looks invalid for server-side use",
        details: {
          message:
            "Use a Supabase server key here: either a legacy service_role JWT or a new sb_secret_ key. Do not use anon/publishable here.",
        },
        debug: supabaseKeyDebug,
      });
    }

    const payload = safeParse(event.body);

    console.log("[create-checkout] raw body:", event.body);
    console.log("[create-checkout] parsed payload:", payload);

    if (!payload) {
      return json(400, { error: "Invalid JSON" });
    }

    const items = normalizeItems(payload);
    const amountCents = normalizeAmountCents(payload);
    const currency = String(payload.currency || "ZAR").toUpperCase();
    const customer = payload.customer ?? null;

    console.log("[create-checkout] normalized input:", {
      itemsCount: items.length,
      amountCents,
      currency,
      customer,
      address: payload?.address ?? null,
    });

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return json(400, {
        error: "Missing/invalid amountCents",
        received: payload.amountCents ?? payload.amount_cents,
      });
    }

    if (currency !== "ZAR") {
      return json(400, {
        error: "Yoco checkout only supports ZAR",
        received: currency,
      });
    }

    if (!items.length) {
      return json(400, { error: "Missing items" });
    }

    const normalizedCheckoutItems = items.map(normalizeCheckoutItem);

    const invalidCheckoutItem = normalizedCheckoutItems.find(
      (x) =>
        !Number.isFinite(x.quantity) ||
        x.quantity <= 0 ||
        !Number.isFinite(x.price_cents) ||
        x.price_cents < 0 ||
        (!x.isSpecialCharge && !x.product_id)
    );

    if (invalidCheckoutItem) {
      return json(400, {
        error:
          "Invalid cart item. Expected valid product UUID for product items, positive qty, and valid price_cents.",
        badItem: {
          name: invalidCheckoutItem.name,
          quantity: invalidCheckoutItem.quantity,
          price_cents: invalidCheckoutItem.price_cents,
          product_id: invalidCheckoutItem.product_id,
          isSpecialCharge: invalidCheckoutItem.isSpecialCharge,
          raw: invalidCheckoutItem.raw,
        },
      });
    }

    const computedAmountCents = normalizedCheckoutItems.reduce(
      (sum, item) => sum + item.total_cents,
      0
    );

    if (computedAmountCents !== amountCents) {
      return json(400, {
        error: "amountCents does not match the sum of checkout line items.",
        details: {
          amountCents,
          computedAmountCents,
          lineItems: normalizedCheckoutItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price_cents: item.price_cents,
            total_cents: item.total_cents,
            isSpecialCharge: item.isSpecialCharge,
          })),
        },
      });
    }

    const productOrderItems = normalizedCheckoutItems.filter((item) => !item.isSpecialCharge);

    if (!productOrderItems.length) {
      return json(400, {
        error: "Checkout must include at least one product item.",
      });
    }

    const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const orderInsertPayload = {
      status: "pending",
      currency,
      amount_cents: amountCents,
      customer_email: customer?.email ? String(customer.email).trim() : null,
      customer_name: buildCustomerName(customer),
      customer_phone: customer?.phone ? String(customer.phone).trim() : null,
    };

    console.log("[create-checkout] order insert payload:", orderInsertPayload);

    const { data: insertedOrders, error: orderErr } = await supabase
      .from("orders")
      .insert(orderInsertPayload)
      .select("id");

    const order = Array.isArray(insertedOrders) ? insertedOrders[0] : null;

    console.log("[create-checkout] order insert result:", {
      order,
      orderErr: cleanSupabaseError(orderErr),
    });

    if (orderErr || !order?.id) {
      return json(500, {
        error: "Order insert failed",
        details: cleanSupabaseError(orderErr),
        attemptedInsert: orderInsertPayload,
        debug: {
          ...supabaseKeyDebug,
          table: "orders",
        },
      });
    }

    orderId = order.id;

    const orderItems = productOrderItems.map((it) => ({
      order_id: orderId,
      product_id: it.product_id,
      name: it.name,
      qty: it.quantity,
      price_cents: it.price_cents,
    }));

    console.log("[create-checkout] order items payload:", orderItems);

    const { error: orderItemsErr } = await supabase.from("order_items").insert(orderItems);

    console.log("[create-checkout] order items insert result:", {
      orderItemsErr: cleanSupabaseError(orderItemsErr),
    });

    if (orderItemsErr) {
      await safeOrderStatusUpdate(supabase, orderId, {
        status: "checkout_create_failed",
      });

      return json(500, {
        error: "Order items insert failed",
        details: cleanSupabaseError(orderItemsErr),
        attemptedInsertCount: orderItems.length,
        orderId,
      });
    }

    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/order-success?order_id=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${baseUrl}/checkout`;
    const failureUrl = `${baseUrl}/checkout`;

    const lineItems = normalizedCheckoutItems.map((it) => ({
      displayName: it.name,
      quantity: it.quantity,
      pricingDetails: {
        price: it.price_cents,
      },
    }));

    const yocoPayload = {
      amount: amountCents,
      currency,
      successUrl,
      cancelUrl,
      failureUrl,
      metadata: { order_id: orderId },
      clientReferenceId: orderId,
      externalId: orderId,
      lineItems,
    };

    console.log("[create-checkout] yoco payload:", yocoPayload);

    const yocoRes = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(yocoPayload),
    });

    let yocoJson: any = null;
    let yocoText = "";

    try {
      yocoJson = await yocoRes.json();
    } catch {
      try {
        yocoText = await yocoRes.text();
      } catch {
        yocoText = "";
      }
    }

    console.log("[create-checkout] yoco response:", {
      ok: yocoRes.ok,
      status: yocoRes.status,
      body: yocoJson ?? yocoText ?? null,
    });

    if (!yocoRes.ok) {
      await safeOrderStatusUpdate(supabase, orderId, {
        status: "checkout_create_failed",
      });

      return json(500, {
        error: "Yoco checkout failed",
        yocoStatus: yocoRes.status,
        details: yocoJson ?? yocoText ?? null,
        debug: {
          ...supabaseKeyDebug,
          baseUrl,
          successUrl,
          cancelUrl,
          failureUrl,
        },
      });
    }

    const redirectUrl = getCheckoutRedirectUrl(yocoJson);

    if (!redirectUrl) {
      await safeOrderStatusUpdate(supabase, orderId, {
        status: "checkout_create_failed",
      });

      return json(500, {
        error: "Yoco did not return a redirectUrl",
        details: yocoJson,
      });
    }

    await safeCheckoutCreatedUpdate(supabase, orderId);

    return json(200, {
      redirectUrl,
      orderId,
    });
  } catch (e: any) {
    console.error("[create-checkout] fatal error:", e);
    console.error("[create-checkout] fatal stack:", e?.stack);

    if (orderId) {
      try {
        const env = getEnv();
        const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });

        await safeOrderStatusUpdate(supabase, orderId, {
          status: "checkout_create_failed",
        });
      } catch {
        // ignore secondary failure
      }
    }

    return json(500, {
      error: e?.message || "Server error",
      orderId,
    });
  }
};