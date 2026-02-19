import { useCart } from "../context/cart";
import { formatZAR } from "../lib/money";
import { Link, useNavigate } from "react-router-dom";
import pageBg from "../assets/new-bg.png";

export default function Cart() {
  const cart = useCart();
  const nav = useNavigate();

  const headingShadow = "0 6px 24px rgba(0,0,0,0.65)";
  const subShadow = "0 2px 12px rgba(0,0,0,0.55)";

  return (
    <main className="relative min-h-screen text-white">
      {/* ✅ Unified fixed background (same as all other pages) */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${pageBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ✅ Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 pt-20 sm:pt-28 pb-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-semibold text-white"
              style={{ textShadow: headingShadow }}
            >
              Cart
            </h1>
            <p
              className="mt-1 text-sm text-white/80"
              style={{ textShadow: subShadow }}
            >
              Courier fee is calculated from total chargeable kg.
            </p>
          </div>

          <Link
            to="/shop"
            className="text-sm text-white/80 hover:text-white"
            style={{ textShadow: subShadow }}
          >
            ← Back to shop
          </Link>
        </div>

        {cart.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-6 text-white/85 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            Your cart is empty. Shocking.
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-3">
              {cart.items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-semibold text-white">{it.name}</div>
                    <div className="text-sm text-white/80">
                      {formatZAR(it.price)} • {it.chargeableKg}kg each
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      className="h-10 w-20 rounded-lg border border-white/20 bg-black/40 px-3 text-sm text-white outline-none focus:border-white/35"
                      type="number"
                      min={1}
                      value={it.qty}
                      onChange={(e) => cart.setQty(it.id, Number(e.target.value))}
                    />
                    <button
                      onClick={() => cart.removeItem(it.id)}
                      className="h-10 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Items total</span>
                <span className="font-semibold text-white">{formatZAR(cart.itemsTotal)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/80">Courier ({cart.courierBracket})</span>
                <span className="font-semibold text-white">{formatZAR(cart.courierFee)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/80">Total kg</span>
                <span className="font-semibold text-white">{cart.totalKg.toFixed(1)}kg</span>
              </div>

              {cart.courierBracket === "over-25kg" ? (
                <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/15 p-3 text-sm text-amber-100">
                  Over 25kg: courier needs a custom quote (MVP rule). Checkout disabled for now.
                </div>
              ) : null}

              <div className="mt-4 flex items-center justify-between border-t border-white/12 pt-4">
                <span className="text-white/80">Grand total</span>
                <span className="text-lg font-semibold text-white">
                  {formatZAR(cart.grandTotal)}
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => cart.clear()}
                  className="h-11 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15"
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
