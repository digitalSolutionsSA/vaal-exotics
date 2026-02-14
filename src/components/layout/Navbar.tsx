import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import logo from "../../assets/vaalexotics-logo.png";
import { useCart } from "../../context/cart";

function computeCartCount(cartCtx: any): number {
  if (!cartCtx) return 0;

  const directCount =
    cartCtx.count ??
    cartCtx.itemCount ??
    cartCtx.totalItems ??
    cartCtx.totalQuantity ??
    cartCtx.total_count;

  if (typeof directCount === "number" && Number.isFinite(directCount)) {
    return directCount;
  }

  const candidates = [
    cartCtx.items,
    cartCtx.cartItems,
    cartCtx.cart,
    cartCtx.lines,
    cartCtx.lineItems,
    cartCtx.products,
    cartCtx.state?.items,
    cartCtx.state?.cartItems,
    cartCtx.state?.cart,
    cartCtx.state?.lines,
  ];

  const arr = candidates.find(Array.isArray) as any[] | undefined;
  if (!arr) return 0;

  return arr.reduce((total, item) => {
    const q = item?.quantity ?? item?.qty ?? item?.count ?? item?.amount ?? 1;
    const n = Number(q);
    return total + (Number.isFinite(n) ? n : 1);
  }, 0);
}

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const cartCtx = useCart();
  const cartCount = useMemo(() => computeCartCount(cartCtx), [cartCtx]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const linkClass = (active: boolean) =>
    [
      "whitespace-nowrap",
      "text-xs sm:text-sm",
      "font-semibold tracking-widest uppercase",
      active ? "text-white" : "text-white/70",
      "transition-colors hover:text-white",
      "px-4 py-2",
      "rounded-full",
      "text-center",
    ].join(" ");

  const mushroomsActive = location.pathname.startsWith("/mushrooms");

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 pt-10">
        <div className="relative mx-auto w-fit">
          <div className="relative rounded-full border border-red-500/70 bg-black/55 backdrop-blur-md shadow-[0_14px_36px_rgba(0,0,0,0.6)]">
            <nav className="grid grid-cols-7 items-center px-10 py-2.5">
              {/* CART */}
              <NavLink
                to="/cart"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `${linkClass(isActive)} relative inline-flex items-center justify-center`
                }
              >
                <span>CART</span>

                {cartCount > 0 && (
                  <span
                    className="
                      animate-pulse
                      absolute -top-1 -right-1
                      min-w-[18px] h-[18px]
                      px-1
                      rounded-full
                      bg-[#C43A2F]
                      text-white
                      text-[10px]
                      font-extrabold
                      leading-none
                      flex items-center justify-center
                      shadow-[0_6px_14px_rgba(0,0,0,0.45)]
                    "
                    aria-label={`${cartCount} items in cart`}
                  >
                    {cartCount}
                  </span>
                )}
              </NavLink>

              {/* FAQ (simple link, no NavLink dependency) */}
              <Link
                to="/faq"
                onClick={() => setOpen(false)}
                className={linkClass(location.pathname === "/faq")}
              >
                FAQ
              </Link>

              <NavLink
                to="/about"
                onClick={() => setOpen(false)}
                className={({ isActive }) => linkClass(isActive)}
              >
                ABOUT
              </NavLink>

              <div aria-hidden />

              {/* MUSHROOMS dropdown */}
              <div
                ref={menuRef}
                className="relative"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className={linkClass(mushroomsActive)}
                >
                  MUSHROOMS <span className="text-white/60">▾</span>
                </button>

                {open && (
                  <>
                    <div className="absolute left-0 right-0 top-full h-4" />

                    <div className="absolute left-1/2 top-full mt-4 w-80 -translate-x-1/2 rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl overflow-hidden">
                      <div className="py-2">
                        <Link
                          to="/mushrooms/grow-kits"
                          className="block px-5 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          Mushroom grow kits
                        </Link>

                        <Link
                          to="/mushrooms/grain-and-cultures"
                          className="block px-5 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          Mushroom grain &amp; cultures
                        </Link>

                        <Link
                          to="/mushrooms/cultivation-supplies"
                          className="block px-5 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          Mushroom cultivation supplies
                        </Link>

                        <Link
                          to="/mushrooms/medicinal-supplements"
                          className="block px-5 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5"
                          onClick={() => setOpen(false)}
                        >
                          Medicinal mushroom supplements
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <NavLink
                to="/bulk-herbal"
                onClick={() => setOpen(false)}
                className={({ isActive }) => linkClass(isActive)}
              >
                BULK HERBAL
              </NavLink>

              <NavLink
                to="/disclaimer"
                onClick={() => setOpen(false)}
                className={({ isActive }) => linkClass(isActive)}
              >
                DISCLAIMER
              </NavLink>
            </nav>

            <Link
              to="/"
              aria-label="Home"
              onClick={() => setOpen(false)}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60]"
            >
              <img
                src={logo}
                alt="Vaal Exotics"
                className="h-24 w-24 sm:h-28 sm:w-28 object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.7)]"
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
