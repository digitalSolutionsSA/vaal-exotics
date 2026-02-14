import { formatZAR } from "../lib/money";
import { Link } from "react-router-dom";

export default function OrderSuccess() {
  const raw = sessionStorage.getItem("lastOrder");
  const order = raw ? JSON.parse(raw) : null;

  if (!order) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-10">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold">No order found</h1>
          <p className="mt-2 text-white/70">This is a dummy portal. Make an order first.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black">
            Back to shop
          </Link>
        </div>
      </main>
    );
  }

  const ownerMessage = [
    `✅ PAID ORDER: ${order.orderId}`,
    `Paid at: ${order.paidAt}`,
    ``,
    `Amount paid: ${formatZAR(order.totals.grandTotal)}`,
    `Courier: ${formatZAR(order.totals.courierFee)} (Total kg: ${order.totals.totalKg.toFixed(1)}kg)`,
    ``,
    `Customer: ${order.customer.firstName} ${order.customer.lastName}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone}`,
    ``,
    `Address:`,
    `${order.address.line1}`,
    order.address.line2 ? `${order.address.line2}` : "",
    `${order.address.suburb}, ${order.address.city}`,
    `${order.address.province}, ${order.address.postalCode}`,
    ``,
    `Items:`,
    ...order.items.map((it: any) => `- ${it.qty}x ${it.name} @ ${formatZAR(it.price)} each`),
  ].filter(Boolean).join("\n");

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-10">
          <h1 className="text-3xl font-semibold">Payment successful (dummy)</h1>
          <p className="mt-2 text-white/70">
            In the real build: this is where Yoco confirms payment and the webhook sends WhatsApp + Email automatically.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold">Order summary</h2>
              <div className="mt-3 text-sm text-white/80 space-y-2">
                <div className="flex justify-between"><span>Items total</span><span>{formatZAR(order.totals.itemsTotal)}</span></div>
                <div className="flex justify-between"><span>Courier</span><span>{formatZAR(order.totals.courierFee)}</span></div>
                <div className="flex justify-between"><span>Total kg</span><span>{order.totals.totalKg.toFixed(1)}kg</span></div>
                <div className="flex justify-between text-base pt-2 border-t border-white/10">
                  <span>Grand total</span>
                  <span className="text-lg font-semibold">{formatZAR(order.totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="text-lg font-semibold">Owner notification preview</h2>
              <p className="mt-2 text-xs text-white/60">
                This is the exact message we’ll send automatically via Email/WhatsApp when webhooks are live.
              </p>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-4 text-xs text-white/80">
                {ownerMessage}
              </pre>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/shop" className="inline-flex justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">
              Shop again
            </Link>
            <Link to="/" className="inline-flex justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10">
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
