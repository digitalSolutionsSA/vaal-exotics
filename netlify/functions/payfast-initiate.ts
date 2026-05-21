import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const PAYFAST_URL = "https://www.payfast.co.za/eng/process";

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
      product_id: it.product_id ?? it.productId ?? null,
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

  // Compact address JSON stored in custom_str1 (255 char limit)
  const addrStr = JSON.stringify({
    l1: String(address?.line1 || "").slice(0, 50),
    l2: String(address?.line2 || "").slice(0, 30),
    sb: String(address?.suburb || "").slice(0, 30),
    ct: String(address?.city || "").slice(0, 30),
    pv: String(address?.province || "").slice(0, 20),
    pc: String(address?.postalCode || "").slice(0, 10),
  }).slice(0, 255);

  // Compact totals + display reference stored in custom_str2 (255 char limit)
  const extraStr = JSON.stringify({
    it: Number(totals.itemsTotal || 0).toFixed(2),
    cf: Number(totals.courierFee || 0).toFixed(2),
    tk: Number(totals.totalKg || 0),
    ref: String(reference).slice(0, 20),
  }).slice(0, 255);

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

  console.log("[payfast-initiate] order created:", orderId, "amount:", grandTotal);

  return json(200, {
    payfastUrl: PAYFAST_URL,
    fields: Object.fromEntries(nonEmptyFields),
    orderId,
  });
};
