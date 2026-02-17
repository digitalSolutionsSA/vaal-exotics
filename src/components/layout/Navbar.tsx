import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingCart, Menu, X, ChevronDown } from "lucide-react";
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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mushroomsOpen, setMushroomsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const cartCtx = useCart();
  const cartCount = useMemo(() => computeCartCount(cartCtx), [cartCtx]);

  const mushroomsActive = location.pathname.startsWith("/mushrooms");

  useEffect(() => {
    setMobileOpen(false);
    setMushroomsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setMushroomsOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  const navBase =
    "text-[12px] sm:text-[13px] font-semibold tracking-widest uppercase whitespace-nowrap transition-colors";

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `${navBase} ${
      isActive ? "text-black" : "text-black/70 hover:text-black"
    }`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* WHITE NAVBAR */}
      <div className="bg-white border-b border-black/10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="h-20 flex items-center justify-between gap-4">
            {/* LEFT: Logo */}
            <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="Home">
              <img
                src={logo}
                alt="Vaal Exotics"
                className="h-14 w-auto object-contain"
              />
              <span className="hidden md:block text-black font-extrabold tracking-widest">
                
              </span>
            </Link>

            {/* CENTER NAV */}
            <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
              <NavLink to="/" className={navLink}>
                HOME
              </NavLink>

              {/* MUSHROOMS */}
              <div
                ref={dropdownRef}
                className="relative"
                onMouseEnter={() => setMushroomsOpen(true)}
                onMouseLeave={() => setMushroomsOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMushroomsOpen((v) => !v)}
                  className={`${navBase} ${
                    mushroomsActive ? "text-black" : "text-black/70 hover:text-black"
                  } inline-flex items-center gap-1`}
                >
                  MUSHROOMS <ChevronDown className="h-4 w-4 text-black/60" />
                </button>

                {mushroomsOpen && (
                  <>
                    <div className="absolute left-1/2 top-full h-4 w-[360px] -translate-x-1/2" />

                    <div className="absolute left-1/2 top-full mt-4 w-[320px] -translate-x-1/2 rounded-xl border border-black/10 bg-white shadow-xl overflow-hidden">
                      <div className="py-2">
                        <Link
                          to="/mushrooms/grow-kits"
                          className="block px-5 py-3 text-sm text-black/80 hover:text-black hover:bg-black/5"
                          onClick={() => setMushroomsOpen(false)}
                        >
                          Mushroom Grow Kits
                        </Link>
                        <Link
                          to="/mushrooms/grain-and-cultures"
                          className="block px-5 py-3 text-sm text-black/80 hover:text-black hover:bg-black/5"
                          onClick={() => setMushroomsOpen(false)}
                        >
                          Mushroom Grain & Cultures
                        </Link>
                        <Link
                          to="/mushrooms/cultivation-supplies"
                          className="block px-5 py-3 text-sm text-black/80 hover:text-black hover:bg-black/5"
                          onClick={() => setMushroomsOpen(false)}
                        >
                          Mushroom Cultivation Supplies
                        </Link>
                        <Link
                          to="/mushrooms/medicinal-supplements"
                          className="block px-5 py-3 text-sm text-black/80 hover:text-black hover:bg-black/5"
                          onClick={() => setMushroomsOpen(false)}
                        >
                          Medicinal Mushroom Supplements
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <NavLink to="/bulk-herbal" className={navLink}>
                BULK HERBAL
              </NavLink>

              <NavLink to="/faq" className={navLink}>
                FAQ
              </NavLink>

              <NavLink to="/disclaimer" className={navLink}>
                DISCLAIMER
              </NavLink>

              <NavLink to="/about" className={navLink}>
                ABOUT
              </NavLink>
            </nav>

            {/* RIGHT ICONS */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full text-black/70 hover:text-black hover:bg-black/5 transition"
              >
                <Search className="h-5 w-5" />
              </button>

              <Link
                to="/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-black/70 hover:text-black hover:bg-black/5 transition"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1
                      min-w-[18px] h-[18px]
                      px-1
                      rounded-full
                      bg-[#C43A2F]
                      text-white
                      text-[10px]
                      font-extrabold
                      flex items-center justify-center
                    "
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full text-black/70 hover:text-black hover:bg-black/5 transition"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* MOBILE MENU */}
          {mobileOpen && (
            <div className="lg:hidden pb-4">
              <div className="mt-2 rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden">
                <div className="p-3 grid gap-2">
                  <NavLink to="/" className={navLink}>HOME</NavLink>
                  <NavLink to="/bulk-herbal" className={navLink}>BULK HERBAL</NavLink>
                  <NavLink to="/faq" className={navLink}>FAQ</NavLink>
                  <NavLink to="/disclaimer" className={navLink}>DISCLAIMER</NavLink>
                  <NavLink to="/about" className={navLink}>ABOUT</NavLink>

                  <div className="border-t border-black/10 pt-2">
                    <Link to="/cart" className="text-black/70 hover:text-black">
                      CART {cartCount > 0 ? `(${cartCount})` : ""}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
