import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";
import { Link, useNavigate } from "react-router-dom";

export default function Cart() {
  const cart = useCart();
  const nav = useNavigate();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Cart</h1>
            <p className="mt-1 text-sm text-white/70">Courier fee is calculated from total chargeable kg.</p>
          </div>
          <Link to="/shop" className="text-sm text-white/80 hover:text-white">← Back to shop</Link>
        </div>

        {cart.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Your cart is empty. Shocking.
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {cart.items.map((it) => (
                <div key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-sm text-white/70">
                      {formatZAR(it.price)} • {it.chargeableKg}kg each
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      className="h-10 w-20 rounded-lg border border-white/15 bg-black/40 px-3 text-sm outline-none"
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => cart.setQty(it.id, Number(e.target.value))}
                    />
                    <button
                      onClick={() => cart.removeItem(it.id)}
                      className="h-10 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold hover:bg-white/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70">Items total</span>
                <span className="font-semibold">{formatZAR(cart.itemsTotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/70">Courier ({cart.courierBracket})</span>
                <span className="font-semibold">{formatZAR(cart.courierFee)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/70">Total kg</span>
                <span className="font-semibold">{cart.totalKg.toFixed(1)}kg</span>
              </div>

              {cart.courierBracket === "over-25kg" ? (
                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-200">
                  Over 25kg: courier needs a custom quote (MVP rule). Checkout disabled for now.
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-white/70">Grand total</span>
                <span className="text-lg font-semibold">{formatZAR(cart.grandTotal)}</span>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => cart.clear()}
                  className="h-11 rounded-lg border border-white/15 bg-white/5 px-5 text-sm font-semibold hover:bg-white/10"
                >
                  Clear cart
                </button>
                <button
                  disabled={cart.courierBracket === "over-25kg"}
                  onClick={() => nav("/checkout")}
                  className="h-11 rounded-lg bg-white px-5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-40"
                >
                  Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
