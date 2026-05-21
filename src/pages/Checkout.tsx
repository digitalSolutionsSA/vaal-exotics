import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";

type BusyAction = "eft" | "payfast" | null;

function asFiniteNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildShortOrderReference() {
  const stamp = Date.now().toString().slice(-6);
  return `VE-${stamp}`;
}

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();

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

  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [orderReference, setOrderReference] = useState("");

  const courierBracket = (cart as any).courierBracket;
  const itemsTotal = asFiniteNumber((cart as any).itemsTotal);
  const courierFee = asFiniteNumber((cart as any).courierFee);
  const totalKg = asFiniteNumber((cart as any).totalKg);
  const grandTotal = asFiniteNumber((cart as any).grandTotal);

  const canCompleteOrder = useMemo(() => {
    if (!cart.items.length) return false;
    if (courierBracket === "over-25kg") return false;

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
    courierBracket,
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

  const isBusy = busyAction !== null;

  function getOrderData(reference?: string) {
    const orderRef = reference || buildShortOrderReference();

    const items = cart.items.map((item: any) => {
      const qty = Math.max(1, Math.round(asFiniteNumber(item.qty, 1)));
      const price = asFiniteNumber(item.price);
      const priceCents =
        item.priceCents != null
          ? asFiniteNumber(item.priceCents)
          : Math.round(price * 100);

      return {
        id: item.id,
        productId: item.productId ?? item.product_id ?? item.id,
        product_id: item.product_id ?? item.productId ?? item.id,
        name: item.name ?? "Product",
        qty,
        quantity: qty,
        price,
        priceCents,
        price_cents: priceCents,
        lineTotal: qty * price,
      };
    });

    return {
      reference: orderRef,
      totals: {
        itemsTotal,
        courierFee,
        totalKg,
        grandTotal,
      },
      customer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
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
        formatted: [
          line1.trim(),
          line2.trim(),
          suburb.trim(),
          city.trim(),
          province.trim(),
          postalCode.trim(),
        ]
          .filter(Boolean)
          .join(", "),
      },
      items,
    };
  }

  async function handlePayViaPayFast() {
    setError("");
    setSuccessMessage("");
    setOrderReference("");

    if (!canCompleteOrder || isBusy) return;

    setBusyAction("payfast");

    try {
      const order = getOrderData();

      try {
        sessionStorage.setItem(
          "pendingOrder",
          JSON.stringify({
            createdAt: new Date().toISOString(),
            paymentMethod: "payfast",
            ...order,
          })
        );
      } catch {
        // ignore sessionStorage issues
      }

      const res = await fetch("/.netlify/functions/payfast-initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to initiate PayFast payment.");
      }

      const { payfastUrl, fields } = data as {
        payfastUrl: string;
        fields: Record<string, string>;
      };

      // Build and auto-submit a hidden form to PayFast
      const form = document.createElement("form");
      form.method = "POST";
      form.action = payfastUrl;
      form.style.display = "none";

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      // Page navigates away — no need to reset busyAction
    } catch (e: any) {
      console.error("[Checkout] PayFast error:", e);
      setError(e?.message || "Failed to start PayFast payment.");
      setBusyAction(null);
    }
  }

  async function handlePayViaEft() {
    setError("");
    setSuccessMessage("");
    setOrderReference("");

    if (!canCompleteOrder || isBusy) return;

    setBusyAction("eft");

    try {
      const order = getOrderData();

      const res = await fetch("/.netlify/functions/send-checkout-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...order,
          customerEmail: order.customer.email,
        }),
      });

      const raw = await res.text();
      let data: any = null;

      try {
        data = JSON.parse(raw);
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(
          data?.details?.message ||
            data?.error ||
            raw ||
            "Failed to send EFT order."
        );
      }

      setOrderReference(order.reference);
      setSuccessMessage("success");

      try {
        sessionStorage.setItem(
          "pendingOrder",
          JSON.stringify({
            createdAt: new Date().toISOString(),
            paymentMethod: "eft",
            ...order,
          })
        );
      } catch {
        // ignore sessionStorage issues
      }
    } catch (e: any) {
      console.error("[Checkout] EFT error:", e);
      setError(e?.message || "Failed to place EFT order.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 md:px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Checkout</h1>
          <p className="mt-2 text-sm text-white/75">
            Complete your details below to pay online or place an EFT order.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(420px,520px)_1fr]">
          <section className="rounded-[24px] border border-white/10 bg-[#0a0a0a] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:p-7">
            <h2 className="mb-5 text-[28px] font-semibold leading-tight">
              Customer details
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />
            </div>

            <div className="mt-3 space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />
            </div>

            <h2 className="mb-5 mt-8 text-[28px] font-semibold leading-tight">
              Delivery address
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Address line 1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />

              <input
                type="text"
                placeholder="Address line 2 (optional)"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Suburb"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
                />
                <input
                  type="text"
                  placeholder="City / Town"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
                />
                <input
                  type="text"
                  placeholder="Postal code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="h-12 w-full rounded-[12px] border border-white/10 bg-black px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20"
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {successMessage === "success" ? (
              <div className="mt-4 rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
                <p className="font-semibold text-emerald-300 text-base">
                  Order received!
                </p>
                <p className="mt-1 text-white/70">
                  A confirmation has been sent to your email address.
                </p>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-white/80">
                    Please use your{" "}
                    <span className="font-semibold text-white">
                      order number or full name
                    </span>{" "}
                    as your payment reference and pay via EFT to the following:
                  </p>
                  <div className="mt-3 rounded-[12px] border border-white/10 bg-black px-4 py-3 space-y-1 text-white/85">
                    <p>
                      <span className="text-white/50">Order Reference: </span>
                      <span className="font-semibold text-white">
                        {orderReference}
                      </span>
                    </p>
                    <p>
                      <span className="text-white/50">Bank: </span>FNB
                    </p>
                    <p>
                      <span className="text-white/50">Account Type: </span>Gold
                      Business Account
                    </p>
                    <p>
                      <span className="text-white/50">Account Number: </span>
                      <span className="font-semibold text-white">
                        63103139283
                      </span>
                    </p>
                    <p>
                      <span className="text-white/50">Branch Code: </span>
                      <span className="font-semibold text-white">250655</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {courierBracket === "over-25kg" ? (
              <div className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Orders over 25kg cannot be checked out online. Please contact
                Vaal Exotics directly.
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handlePayViaPayFast}
                disabled={!canCompleteOrder || isBusy}
                className="h-12 w-full rounded-[14px] bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === "payfast"
                  ? "Redirecting to PayFast..."
                  : "Pay online with PayFast"}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/40">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handlePayViaEft}
                disabled={!canCompleteOrder || isBusy}
                className="h-12 w-full rounded-[14px] border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyAction === "eft" ? "Sending..." : "Place order via EFT"}
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/55">
              PayFast accepts card, Instant EFT, and more — payment is
              confirmed immediately. EFT requires a manual bank transfer after
              ordering.
            </p>
          </section>

          <aside className="rounded-[24px] border border-white/10 bg-[#0a0a0a] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:p-6">
            <h2 className="mb-5 text-[20px] font-semibold">Order summary</h2>

            <div className="space-y-3">
              {cart.items.map((item: any) => {
                const qty = Math.max(
                  1,
                  Math.round(asFiniteNumber(item.qty, 1))
                );
                const price = asFiniteNumber(item.price);
                const lineTotal = qty * price;

                return (
                  <div
                    key={item.id ?? `${item.name}-${qty}`}
                    className="rounded-[16px] border border-white/10 bg-black px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-[18px] font-semibold text-white">
                          {item.name} ({qty})
                        </p>
                        <p className="mt-1 text-sm text-white/60">Qty: {qty}</p>
                      </div>
                      <div className="shrink-0 text-[18px] font-semibold text-white">
                        {formatZAR(lineTotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 rounded-[16px] border border-white/10 bg-black px-4 py-4">
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>Items total</span>
                  <span>{formatZAR(itemsTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Courier</span>
                  <span>{formatZAR(courierFee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total weight</span>
                  <span>{totalKg}kg</span>
                </div>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-[18px] font-bold text-white">
                  <span>Grand total</span>
                  <span>{formatZAR(grandTotal)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/products")}
              className="mt-5 h-12 rounded-[14px] border border-white/10 bg-black px-5 text-sm font-medium text-white transition hover:bg-white/5"
            >
              Continue shopping
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}