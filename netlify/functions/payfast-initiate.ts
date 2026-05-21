import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PAYFAST_URL_LIVE = "https://www.payfast.co.za/eng/process";
const PAYFAST_URL_SANDBOX = "https://sandbox.payfast.co.za/eng/process";

function getEnv() {
  return {
    PAYFAST_MERCHANT_ID: process.env.PAYFAST_MERCHANT_ID ?? "",
    PAYFAST_MERCHANT_KEY: process.env.PAYFAST_MERCHANT_KEY ?? "",
    PAYFAST_PASSPHRASE: process.env.PAYFAST_PASSPHRASE ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    APP_URL: (
      process.env.APP_URL ||
      process.env.URL ||
      "https://vaalexotics.co.za"
    ).replace(/\/+$/, ""),
    PAYFAST_SANDBOX: process.env.PAYFAST_SANDBOX === "true",
  };
}

// Match PHP urlencode() behaviour for signature generation
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

function generateSignature(
  fields: [string, string][],
  passphrase: string
): string {
  const paramString = fields
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");

  const withPass = passphrase
    ? `${paramString}&passphrase=${pfEncode(passphrase)}`
    : paramString;

  return crypto.createHash("md5").update(withPass).digest("hex");
}

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractProductId(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  // Cart item ids may be "uuid:base" or "uuid:variantId" — strip suffix
  const base = s.includes(":") ? s.split(":")[0] : s;
  return UUID_RE.test(base) ? base : null;
}

function isShippingItem(it: any): boolean {
  const id = String(it?.id ?? it?.productId ?? it?.product_id ?? "").toLowerCase();
  const name = String(it?.name ?? "").toLowerCase();
  return (
    ["shipping", "courier", "delivery"].includes(id) ||
    /shipping|courier|delivery/.test(name)
  );
}

export const handler: Handler = async (event) => {
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

  const env = getEnv();

  if (!env.PAYFAST_MERCHANT_ID || !env.PAYFAST_MERCHANT_KEY) {
    return json(500, { error: "PayFast not configured" });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Supabase not configured" });
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { reference, customer, address, items, totals } = payload;

  if (!reference || !customer?.email || !items?.length || !totals) {
    return json(400, { error: "Missing required order data" });
  }

  const grandTotal = Number(totals.grandTotal || 0);
  if (!grandTotal || grandTotal <= 0) {
    return json(400, { error: "Invalid order total" });
  }

  // Store order in Supabase so the ITN can look up items for the email
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: inserted, error: orderErr } = await supabase
    .from("orders")
    .insert({
      status: "pending",
      currency: "ZAR",
      amount_cents: Math.round(grandTotal * 100),
      customer_email: String(customer.email).trim(),
      customer_name: `${String(customer.firstName || "").trim()} ${String(
        customer.lastName || ""
      ).trim()}`.trim(),
      customer_phone: String(customer.phone || "").trim(),
    })
    .select("id")
    .single();

  if (orderErr || !inserted?.id) {
    console.error("[payfast-initiate] Order insert failed:", orderErr);
    return json(500, {
      error: "Failed to create order",
      details: orderErr?.message,
    });
  }

  const orderId: string = inserted.id;

  // Insert product line items (skip shipping rows)
  const productItems = items.filter((it: any) => !isShippingItem(it));
  if (productItems.length) {
    const orderItems = productItems.map((it: any) => ({
      order_id: orderId,
      product_id: extractProductId(it.product_id ?? it.productId ?? it.id),
      name: String(it.name || "Product"),
      qty: Math.max(1, Math.round(Number(it.qty ?? it.quantity ?? 1))),
      price_cents: Math.round(Number(it.price || 0) * 100),
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("[payfast-initiate] Order items insert failed:", itemsErr);
    }
  }

  // Encode address as base64url (WAF-safe — no JSON braces/quotes/colons)
  const addrRaw = [
    String(address?.line1 || "").slice(0, 60),
    String(address?.line2 || "").slice(0, 40),
    String(address?.suburb || "").slice(0, 40),
    String(address?.city || "").slice(0, 40),
    String(address?.province || "").slice(0, 30),
    String(address?.postalCode || "").slice(0, 10),
  ].join("|");
  const addrStr = Buffer.from(addrRaw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 255);

  // Encode extra totals + reference as base64url
  const extraRaw = [
    Number(totals.itemsTotal || 0).toFixed(2),
    Number(totals.courierFee || 0).toFixed(2),
    String(totals.totalKg || 0),
    String(reference).slice(0, 20),
  ].join("|");
  const extraStr = Buffer.from(extraRaw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 255);

  // Normalise phone to 10-digit SA format
  const rawPhone = String(customer.phone || "").replace(/\D/g, "");
  const phone = rawPhone.startsWith("27")
    ? "0" + rawPhone.slice(2)
    : rawPhone.slice(-10);

  // Field order matters for PayFast signature
  const fields: [string, string][] = [
    ["merchant_id", env.PAYFAST_MERCHANT_ID],
    ["merchant_key", env.PAYFAST_MERCHANT_KEY],
    ["return_url", `${env.APP_URL}/order-success?payment=payfast`],
    ["cancel_url", `${env.APP_URL}/checkout`],
    ["notify_url", `${env.APP_URL}/.netlify/functions/payfast-itn`],
    ["name_first", String(customer.firstName || "").trim()],
    ["name_last", String(customer.lastName || "").trim()],
    ["email_address", String(customer.email || "").trim()],
    ["cell_number", phone],
    ["m_payment_id", orderId],
    ["amount", grandTotal.toFixed(2)],
    ["item_name", `Vaal Exotics Order ${reference}`],
    ["custom_str1", addrStr],
    ["custom_str2", extraStr],
  ];

  const nonEmptyFields = fields.filter(([, v]) => v !== "");
  const signature = generateSignature(nonEmptyFields, env.PAYFAST_PASSPHRASE);
  nonEmptyFields.push(["signature", signature]);

  const payfastUrl = env.PAYFAST_SANDBOX ? PAYFAST_URL_SANDBOX : PAYFAST_URL_LIVE;

  // Build the raw param string so it's visible in Netlify logs for debugging
  const debugParamString = nonEmptyFields
    .filter(([k]) => k !== "signature")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");

  console.log("[payfast-initiate] orderId:", orderId);
  console.log("[payfast-initiate] amount:", grandTotal, "sandbox:", env.PAYFAST_SANDBOX);
  console.log("[payfast-initiate] payfastUrl:", payfastUrl);
  console.log("[payfast-initiate] param string for signature (pre-passphrase):", debugParamString);
  console.log("[payfast-initiate] signature:", signature);
  console.log("[payfast-initiate] all field keys:", nonEmptyFields.map(([k]) => k).join(", "));

  return json(200, {
    payfastUrl,
    fields: Object.fromEntries(nonEmptyFields),
    orderId,
  });
};
