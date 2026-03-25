import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function toCents(amountZar: number) {
  // Handles floating point safely enough for ZAR amounts in UI
  const n = Number(amountZar);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asFiniteNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeWhatsAppNumber(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function buildShortEftReference() {
  const stamp = Date.now().toString().slice(-6);
  return `VE-${stamp}`;
}

export default function Checkout() {
  const cart = useCart();
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [suburb, setSuburb] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canPay = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (cart.courierBracket === "over-25kg") return false;

    return Boolean(
      firstName.trim() &&
        lastName.trim() &&
        email.trim() &&
        phone.trim() &&
        line1.trim() &&
        suburb.trim() &&
        city.trim() &&
        province.trim() &&
        postalCode.trim()
    );
  }, [
    cart.items.length,
    cart.courierBracket,
    firstName,
    lastName,
    email,
    phone,
    line1,
    suburb,
    city,
    province,
    postalCode,
  ]);

  function buildPendingPayload(paymentMethod: "yoco" | "eft", eftReference?: string) {
    return {
      createdAt: new Date().toISOString(),
      paymentMethod,
      eftReference: eftReference || null,
      totals: {
        itemsTotal: asFiniteNumber((cart as any).itemsTotal),
        courierFee: asFiniteNumber((cart as any).courierFee),
        totalKg: asFiniteNumber((cart as any).totalKg),
        grandTotal: asFiniteNumber((cart as any).grandTotal),
      },
      customer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      },
      address: {
        line1: line1.trim(),
        line2: line2.trim(),
        suburb: suburb.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
      },
      items: cart.items,
    };
  }

  function buildEftWhatsAppMessage() {
    const eftReference = buildShortEftReference();

    const itemsTotal = asFiniteNumber((cart as any).itemsTotal);
    const courierFee = asFiniteNumber((cart as any).courierFee);
    const totalKg = asFiniteNumber((cart as any).totalKg);
    const grandTotal = asFiniteNumber((cart as any).grandTotal);

    const itemsLines = cart.items
      .map((it: any) => {
        const qty = Math.max(1, Math.round(asFiniteNumber(it.qty, 1)));
        const lineTotal = asFiniteNumber(it.price) * qty;
        return `- ${qty}x ${it.name} - ${formatZAR(lineTotal)}`;
      })
      .join("\n");

    const addressLines = [
      line1.trim(),
      line2.trim() || null,
      suburb.trim(),
      city.trim(),
      province.trim(),
      postalCode.trim(),
    ]
      .filter(Boolean)
      .join("\n");

    const message = `Hi, I would like to pay via EFT.

Reference: ${eftReference}

Order details:
${itemsLines}

Items total: ${formatZAR(itemsTotal)}
Courier: ${formatZAR(courierFee)}
Total kg: ${totalKg.toFixed(1)}kg
Grand total: ${formatZAR(grandTotal)}

Customer details:
Name: ${firstName.trim()} ${lastName.trim()}
Email: ${email.trim()}
Phone: ${phone.trim()}

Delivery address:
${addressLines}

Please send me the EFT banking details / payment instructions.`;

    return { message, eftReference };
  }

  function startEftCheckout() {
    setError("");

    if (!canPay || busy) return;

    try {
      const whatsappNumber = sanitizeWhatsAppNumber(
        ((import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP as string | undefined) ||
          "27782166865"
      );

      if (!whatsappNumber) {
        throw new Error("WhatsApp number is missing. Please set VITE_VAAL_EXOTICS_WHATSAPP.");
      }

      const { message, eftReference } = buildEftWhatsAppMessage();

      const pendingPayload = buildPendingPayload("eft", eftReference);
      sessionStorage.setItem("pendingOrder", JSON.stringify(pendingPayload));

      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("[Checkout] startEftCheckout error:", e);
      setError(e?.message || "Failed to open WhatsApp for EFT.");
    }
  }

  async function startYocoCheckout() {
    setError("");
    if (!canPay || busy) return;

    setBusy(true);

    try {
      const itemsTotal = asFiniteNumber((cart as any).itemsTotal);
      const courierFee = asFiniteNumber((cart as any).courierFee);
      const grandTotal = asFiniteNumber((cart as any).grandTotal);

      if (![itemsTotal, courierFee, grandTotal].every(Number.isFinite)) {
        throw new Error("Totals are invalid (NaN). Please refresh and try again.");
      }

      const expected = itemsTotal + courierFee;

      if (Math.abs(expected - grandTotal) > 0.01) {
        throw new Error(
          `Totals mismatch. Items (${formatZAR(itemsTotal)}) + Courier (${formatZAR(
            courierFee
          )}) ≠ Grand total (${formatZAR(grandTotal)}). Please refresh and try again.`
        );
      }

      const amountCents = toCents(grandTotal);

      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new Error("Total amount is invalid.");
      }

      const items = cart.items.map((it: any) => {
        const qty = Math.max(1, Math.round(asFiniteNumber(it.qty, 1)));
        const priceZar = asFiniteNumber(it.price);

        return {
          // send both so the backend has less to complain about
          id: it.id,
          product_id: it.product_id ?? it.productId ?? it.id,
          name: it.name,
          qty,
          quantity: qty,
          price_cents: toCents(priceZar),
          priceCents: toCents(priceZar),
        };
      });

      const customer = {
        email: email.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      };

      const address = {
        line1: line1.trim(),
        line2: line2.trim() || undefined,
        suburb: suburb.trim(),
        city: city.trim(),
        province: province.trim(),
        postalCode: postalCode.trim(),
      };

      const pendingPayload = buildPendingPayload("yoco");
      sessionStorage.setItem("pendingOrder", JSON.stringify(pendingPayload));

      const requestBody = {
        amountCents,
        currency: "ZAR",
        items,
        customer,
        address,
      };

      console.log("[Checkout] create-checkout request body:", requestBody);

      const res = await fetch("/.netlify/functions/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const raw = await res.text();
      const data = safeJsonParse(raw);

      console.log("[Checkout] create-checkout response status:", res.status);
      console.log("[Checkout] create-checkout response raw:", raw);
      console.log("[Checkout] create-checkout response parsed:", data);

      if (!res.ok) {
        const msg =
          (data as any)?.error ||
          (data as any)?.details?.message ||
          (data as any)?.details?.error ||
          (typeof (data as any)?.details === "string" ? (data as any).details : "") ||
          raw ||
          `Failed to create Yoco checkout (${res.status}).`;

        throw new Error(String(msg));
      }

      const redirectUrl =
        (data as any)?.redirectUrl ||
        (data as any)?.checkout_url ||
        (data as any)?.url;

      if (!redirectUrl || typeof redirectUrl !== "string") {
        throw new Error(
          `Checkout redirect URL missing. Response was: ${raw || "(empty)"}`
        );
      }

      window.location.href = redirectUrl;
    } catch (e: any) {
      console.error("[Checkout] startYocoCheckout error:", e);
      setError(e?.message || "Payment failed to start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-1 text-sm text-white/70">
          Secure payment via Yoco Checkout or request EFT via WhatsApp.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Customer details</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none sm:col-span-2"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none sm:col-span-2"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <h2 className="mt-7 text-lg font-semibold">Delivery address</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Address line 1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
              />
              <input
                className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Address line 2 (optional)"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Suburb"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                />
                <input
                  className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
                <input
                  className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Postal code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <div className="mt-4 space-y-2 text-sm">
              {cart.items.map((it: any) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between text-white/80"
                >
                  <span>
                    {it.qty}x {it.name}
                  </span>
                  <span>{formatZAR(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">Items total</span>
                <span className="font-semibold">
                  {formatZAR(cart.itemsTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Courier</span>
                <span className="font-semibold">
                  {formatZAR(cart.courierFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Total kg</span>
                <span className="font-semibold">
                  {cart.totalKg.toFixed(1)}kg
                </span>
              </div>
              <div className="flex justify-between pt-2 text-base">
                <span className="text-white/70">Grand total</span>
                <span className="text-lg font-semibold">
                  {formatZAR(cart.grandTotal)}
                </span>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              disabled={!canPay || busy}
              onClick={startYocoCheckout}
              className="mt-6 h-11 w-full rounded-lg bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-40"
            >
              {busy ? "Redirecting to payment..." : "Pay now"}
            </button>

            <button
              type="button"
              disabled={!canPay || busy}
              onClick={startEftCheckout}
              className="mt-3 h-11 w-full rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
            >
              Pay via EFT
            </button>

            {cart.courierBracket === "over-25kg" ? (
              <p className="mt-3 text-xs text-white/60">
                Over 25kg orders are not available for checkout. Please contact
                us for a custom courier quote.
              </p>
            ) : !canPay ? (
              <p className="mt-3 text-xs text-white/50">
                Fill in all details to enable payment or EFT request.
              </p>
            ) : (
              <p className="mt-3 text-xs text-white/50">
                EFT requests open WhatsApp with your customer and order details pre-filled.
              </p>
            )}

            <button
              type="button"
              onClick={() => nav("/cart")}
              className="mt-3 h-10 w-full rounded-lg border border-white/15 bg-white/5 text-sm text-white hover:bg-white/10"
            >
              Back to cart
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}