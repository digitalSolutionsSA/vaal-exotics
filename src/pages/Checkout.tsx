import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const canPay = useMemo(() => {
    if (cart.items.length === 0) return false;
    if (cart.courierBracket === "over-25kg") return false;
    return (
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
  }, [cart.items.length, cart.courierBracket, firstName, lastName, email, phone, line1, suburb, city, province, postalCode]);

  function fakePay() {
    const orderId = `VE-${Date.now()}`;
    const payload = {
      orderId,
      paidAt: new Date().toISOString(),
      totals: {
        itemsTotal: cart.itemsTotal,
        courierFee: cart.courierFee,
        totalKg: cart.totalKg,
        grandTotal: cart.grandTotal,
      },
      customer: { firstName, lastName, email, phone },
      address: { line1, line2, suburb, city, province, postalCode },
      items: cart.items,
    };

    sessionStorage.setItem("lastOrder", JSON.stringify(payload));
    cart.clear();
    nav("/order/success");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-1 text-sm text-white/70">Dummy payment portal. Yoco comes later.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Customer details</h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none sm:col-span-2"
                placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none sm:col-span-2"
                placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <h2 className="mt-7 text-lg font-semibold">Delivery address</h2>
            <div className="mt-4 grid gap-3">
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Address line 1" value={line1} onChange={(e) => setLine1(e.target.value)} />
              <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                placeholder="Address line 2 (optional)" value={line2} onChange={(e) => setLine2(e.target.value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Suburb" value={suburb} onChange={(e) => setSuburb(e.target.value)} />
                <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Province" value={province} onChange={(e) => setProvince(e.target.value)} />
                <input className="h-11 rounded-lg border border-white/15 bg-black/40 px-4 text-sm outline-none"
                  placeholder="Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <div className="mt-4 space-y-2 text-sm">
              {cart.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-white/80">
                  <span>{it.qty}x {it.name}</span>
                  <span>{formatZAR(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-white/70">Items total</span>
                <span className="font-semibold">{formatZAR(cart.itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Courier</span>
                <span className="font-semibold">{formatZAR(cart.courierFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Total kg</span>
                <span className="font-semibold">{cart.totalKg.toFixed(1)}kg</span>
              </div>
              <div className="flex justify-between text-base pt-2">
                <span className="text-white/70">Grand total</span>
                <span className="text-lg font-semibold">{formatZAR(cart.grandTotal)}</span>
              </div>
            </div>

            <button
              disabled={!canPay}
              onClick={fakePay}
              className="mt-6 h-11 w-full rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 disabled:opacity-40"
            >
              Pay now (dummy)
            </button>

            {!canPay ? (
              <p className="mt-3 text-xs text-white/50">
                Fill in all details to enable payment. Over 25kg disables checkout.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
