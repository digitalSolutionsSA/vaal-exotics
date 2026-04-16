import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function asFiniteNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeWhatsAppNumber(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function buildShortOrderReference() {
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
  const [successMessage, setSuccessMessage] = useState("");

  const canCompleteOrder = useMemo(() => {
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

  function getOrderData(reference?: string) {
    const itemsTotal = asFiniteNumber((cart as any).itemsTotal);
    const courierFee = asFiniteNumber((cart as any).courierFee);
    const totalKg = asFiniteNumber((cart as any).totalKg);
    const grandTotal = asFiniteNumber((cart as any).grandTotal);

    const orderReference = reference || buildShortOrderReference();

    const items = cart.items.map((it: any) => {
      const qty = Math.max(1, Math.round(asFiniteNumber(it.qty, 1)));
      const price = asFiniteNumber(it.price);

      return {
        id: it.id,
        name: it.name,
        qty,
        price,
        lineTotal: price * qty,
      };
    });

    return {
      reference: orderReference,
      totals: {
        itemsTotal,
        courierFee,
        totalKg,
        grandTotal,
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
      items,
    };
  }

  function buildPendingPayload(reference?: string) {
    const order = getOrderData(reference);

    return {
      createdAt: new Date().toISOString(),
      paymentMethod: "eft",
      eftReference: order.reference,
      totals: order.totals,
      customer: order.customer,
      address: order.address,
      items: order.items,
    };
  }

  function buildWhatsAppMessage(reference?: string) {
    const order = getOrderData(reference);

    const itemsLines = order.items
      .map((it) => `- ${it.qty}x ${it.name} - ${formatZAR(it.lineTotal)}`)
      .join("\n");

    const addressLines = [
      order.address.line1,
      order.address.line2 || null,
      order.address.suburb,
      order.address.city,
      order.address.province,
      order.address.postalCode,
    ]
      .filter(Boolean)
      .join("\n");

    return `Hi, I would like to place an order.

Reference: ${order.reference}

Order details:
${itemsLines}

Items total: ${formatZAR(order.totals.itemsTotal)}
Courier: ${formatZAR(order.totals.courierFee)}
Total kg: ${order.totals.totalKg.toFixed(1)}kg
Grand total: ${formatZAR(order.totals.grandTotal)}

Customer details:
Name: ${order.customer.firstName} ${order.customer.lastName}
Email: ${order.customer.email}
Phone: ${order.customer.phone}

Delivery address:
${addressLines}

Please send me the EFT banking details / payment instructions.`;
  }

  async function handleCompleteOrder() {
    setError("");
    setSuccessMessage("");

    if (!canCompleteOrder || busy) return;

    setBusy(true);

    try {
      const whatsappNumber = sanitizeWhatsAppNumber(
        ((import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP as
          | string
          | undefined) || "27782166865"
      );

      if (!whatsappNumber) {
        throw new Error(
          "WhatsApp number is missing. Please set VITE_VAAL_EXOTICS_WHATSAPP."
        );
      }

      const reference = buildShortOrderReference();
      const order = getOrderData(reference);
      const pendingPayload = buildPendingPayload(reference);

      sessionStorage.setItem("pendingOrder", JSON.stringify(pendingPayload));

      const emailRes = await fetch("/.netlify/functions/send-checkout-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });

      const raw = await emailRes.text();
      let data: any = null;

      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      if (!emailRes.ok) {
        throw new Error(
          data?.error || raw || "Failed to send order email."
        );
      }

      const message = buildWhatsAppMessage(reference);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      setSuccessMessage(
        "Order email sent to Vaal Exotics management. Opening WhatsApp now."
      );

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      console.error("[Checkout] handleCompleteOrder error:", e);
      setError(e?.message || "Failed to complete order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-1 text-sm text-white/70">
          Complete your order to email Vaal Exotics management and open
          WhatsApp with the same order details ready to send.
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

            {successMessage ? (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {successMessage}
              </div>
            ) : null}

            <button
              type="button"
              disabled={!canCompleteOrder || busy}
              onClick={handleCompleteOrder}
              className="mt-6 h-11 w-full rounded-lg bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-40"
            >
              {busy ? "Completing order..." : "Complete order"}
            </button>

            {cart.courierBracket === "over-25kg" ? (
              <p className="mt-3 text-xs text-white/60">
                Over 25kg orders are not available for checkout. Please contact
                us for a custom courier quote.
              </p>
            ) : !canCompleteOrder ? (
              <p className="mt-3 text-xs text-white/50">
                Fill in all details to enable order completion.
              </p>
            ) : (
              <p className="mt-3 text-xs text-white/50">
                This will email Vaal Exotics management first, then open
                WhatsApp with the same order details for the customer to send.
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