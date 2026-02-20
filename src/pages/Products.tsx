import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import productsBg from "../assets/new-bg.png";
import { supabase } from "../lib/supabase";
import ProductQuickView from "../components/ProductQuickView";
import { useCart } from "../context/cart";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const BRAND_RED = "#C43A2F";
const BRAND_BLUE = "#2F4D7A";

type VariantUnit = "kg" | "l";

type ProductVariant = {
  id: string;
  unit: VariantUnit;
  size: string;
  price: number;
};

type ShopProduct = {
  id: string;
  name: string;
  slug?: string | null;
  category: string;
  price: number;
  price_cents?: number | null;
  description: string | null;

  in_stock?: boolean | null;
  stock_count?: number | null;

  image_url?: string | null;
  images?: any;
  variants?: any;
  created_at?: string;
};

function formatZar(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? `R${n.toFixed(2)}` : "R0.00";
}

function normCategory(input: any) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
}

function safeArray<T = any>(maybeArray: any): T[] {
  if (!maybeArray) return [];
  if (Array.isArray(maybeArray)) return maybeArray;
  if (typeof maybeArray === "string") {
    try {
      const parsed = JSON.parse(maybeArray);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getBestImage(p: ShopProduct) {
  const imgs = safeArray<string>(p.images);
  return imgs?.[0] || p.image_url || "";
}

function isInStock(p: ShopProduct) {
  const inStockFlag = p.in_stock ?? true;
  const count = Number(p.stock_count ?? 0);

  if (Number.isFinite(count) && count >= 0) return inStockFlag && count > 0;
  return !!inStockFlag;
}

function normalizeVariants(p: ShopProduct): ProductVariant[] {
  const v = safeArray<any>(p.variants);

  return v
    .filter(Boolean)
    .map((x: any, i: number) => ({
      id: String(x.id ?? `${p.id}_${i}`),
      unit: (x.unit === "l" ? "l" : "kg") as VariantUnit,
      size: String(x.size ?? ""),
      price: Number(x.price ?? 0),
    }))
    .filter((x) => x.size && Number.isFinite(x.price) && x.price > 0)
    .sort((a, b) => a.price - b.price);
}

function shortVariantLabel(v: ProductVariant) {
  return `${v.size}${v.unit.toUpperCase()}`;
}

function normalizeProductRow(p: any): ShopProduct {
  // Preserve your old pricing fallbacks (price, price_cents, variants)
  const basePrice = Number(p?.price);
  const hasBase = Number.isFinite(basePrice) && basePrice > 0;

  const centsRaw = p?.price_cents;
  const centsNum = centsRaw === null || centsRaw === undefined ? NaN : Number(centsRaw);
  const hasCents = Number.isFinite(centsNum) && centsNum > 0;

  const variants = safeArray<any>(p?.variants);
  const variantPrices = variants
    .map((v: any) => Number(v?.price))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  const fromVariants = variantPrices.length ? Math.min(...variantPrices) : NaN;

  const price = hasBase ? basePrice : hasCents ? centsNum / 100 : Number.isFinite(fromVariants) ? fromVariants : 0;

  return {
    ...p,
    variants,
    price,
  } as ShopProduct;
}

export default function Products() {
  const cart: any = useCart();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("featured");

  // Bulk exclusion (same as your current Products page)
  const BULK_CATEGORY = "Bulk Herbal Products";
  const bulkNorm = normCategory(BULK_CATEGORY);

  // ✅ Controlled popup state (same pattern as BulkHerbal)
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ShopProduct | null>(null);
  const [activeAccent, setActiveAccent] = useState<"red" | "blue">("blue");

  // ✅ Selected variant per product (same as BulkHerbal)
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>(
    {}
  );

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase
      .from("products")
      .select(
        "id,name,slug,category,price,price_cents,description,in_stock,stock_count,image_url,images,variants,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products fetch error:", error);
      setProducts([]);
      setErrorMsg(error.message || "Failed to load products (check RLS/policies).");
      setLoading(false);
      return;
    }

    // normalize + exclude bulk
    const cleaned = (data ?? [])
      .map(normalizeProductRow)
      .filter((p: any) => {
        if (normCategory(p?.category) === bulkNorm) return false;
        return true;
      }) as ShopProduct[];

    setProducts(cleaned);

    // seed selected variant to cheapest (if exists)
    const seed: Record<string, string> = {};
    for (const p of cleaned) {
      const vars = normalizeVariants(p);
      if (vars.length) seed[p.id] = vars[0].id;
    }
    setSelectedVariantByProduct(seed);

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkNorm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!filtersOpen) return;
      const el = dropdownRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setFiltersOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [filtersOpen]);

  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (filtersOpen && e.key === "Escape") setFiltersOpen(false);
      if (open && e.key === "Escape") {
        setOpen(false);
        setActive(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen, open]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products as any[]) {
      const label = String(p?.category ?? "").trim();
      if (!label) continue;
      const key = normCategory(label);
      if (!map.has(key)) map.set(key, label);
    }
    const labels = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    return ["All", ...labels];
  }, [products]);

  const priceStats = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const vals = products.map((p: any) => Number(p.price)).filter((n: any) => Number.isFinite(n));
    if (!vals.length) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    const selectedCatNorm = category === "All" ? "all" : normCategory(category);

    let list = (products as ShopProduct[]).filter((p) => {
      if (category !== "All") {
        const pCatNorm = normCategory(p?.category);
        if (pCatNorm !== selectedCatNorm) return false;
      }

      if (q) {
        const hay = `${p?.name ?? ""} ${p?.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const price = Number(p?.price);
      if (min !== null && !Number.isNaN(min) && Number.isFinite(price) && price < min) return false;
      if (max !== null && !Number.isNaN(max) && Number.isFinite(price) && price > max) return false;

      return true;
    });

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        list = [...list].sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name-asc":
        list = [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)));
        break;
      case "name-desc":
        list = [...list].sort((a, b) => String(b.name).localeCompare(String(a.name)));
        break;
      default:
        break;
    }

    return list;
  }, [products, query, category, minPrice, maxPrice, sort]);

  const openPopup = (p: ShopProduct, idx: number) => {
    setActive(p);
    setActiveAccent(idx % 2 === 0 ? "blue" : "red");
    setOpen(true);
  };

  // ✅ Same callback signature as GrowKits expects
  const addToCart = ({ product, qty, variant }: any) => {
    const fn =
      cart?.addToCart ||
      cart?.addItem ||
      cart?.add ||
      cart?.addProduct ||
      cart?.actions?.addToCart ||
      cart?.actions?.addItem;

    if (typeof fn === "function") {
      try {
        fn({ product, qty, variant });
        return;
      } catch {
        try {
          fn(product, qty, variant);
          return;
        } catch {
          // fall through
        }
      }
    }

    console.log("ADD TO CART (no cart handler found):", { productId: product?.id, qty, variant });
  };

  const headingShadow = "0 6px 24px rgba(0,0,0,0.65)";
  const subShadow = "0 2px 12px rgba(0,0,0,0.55)";

  return (
    <main className="relative min-h-screen text-black">
      {/* ✅ Background EXACTLY like BulkHerbal */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${productsBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-6 sm:px-10 xl:px-16 pt-16 pb-20">
        {/* Headings styled like BulkHerbal */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80"
              style={{ textShadow: subShadow }}
            >
              Shop
            </p>

            <h1
              className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
              style={{ textShadow: headingShadow }}
            >
              View Products
            </h1>

            <p className="mt-3 max-w-2xl text-white/80" style={{ textShadow: subShadow }}>
              All categories in one place. Filter by category, price and search.
            </p>

            <div className="mt-4 text-white/80 text-sm" style={{ textShadow: subShadow }}>
              Showing{" "}
              <span className="font-extrabold text-white">{filteredProducts.length}</span> of{" "}
              <span className="font-extrabold text-white">{products.length}</span> products
            </div>
          </div>

          {/* Controls */}
          <div className="relative flex flex-wrap items-center gap-2" ref={dropdownRef}>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-extrabold text-white border border-white/25 bg-white/10 backdrop-blur hover:bg-white/15 transition"
              style={{ borderRadius: 0, textShadow: subShadow }}
              aria-expanded={filtersOpen}
              aria-haspopup="true"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-extrabold text-white border border-white/25 bg-white/10 backdrop-blur hover:bg-white/15 transition"
              style={{ borderRadius: 0, textShadow: subShadow }}
            >
              Back to Home
            </Link>

            {filtersOpen && (
              <div
                className="absolute right-0 top-12 z-50 w-[min(92vw,860px)] border border-black/15 bg-white/90 backdrop-blur shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-black/10">
                  <div className="text-sm font-extrabold text-black">Filters</div>
                  <div className="ml-auto text-xs text-black/60">
                    Price range: {formatZar(priceStats.min)}–{formatZar(priceStats.max)}
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="ml-2 border border-black/15 bg-black/5 p-2 hover:bg-black/10 transition"
                    style={{ borderRadius: 0 }}
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4 text-black/70" />
                  </button>
                </div>

                <div className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="relative lg:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full border border-black/15 bg-white px-9 pr-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
                      style={{ borderRadius: 0 }}
                    />
                  </div>

                  <div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black/30"
                      style={{ borderRadius: 0 }}
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black/30"
                      style={{ borderRadius: 0 }}
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low → High</option>
                      <option value="price-desc">Price: High → Low</option>
                      <option value="name-asc">Name: A → Z</option>
                      <option value="name-desc">Name: Z → A</option>
                    </select>
                  </div>

                  <div>
                    <input
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      inputMode="numeric"
                      placeholder="Min price"
                      className="w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
                      style={{ borderRadius: 0 }}
                    />
                  </div>

                  <div>
                    <input
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      inputMode="numeric"
                      placeholder="Max price"
                      className="w-full border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
                      style={{ borderRadius: 0 }}
                    />
                  </div>
                </div>

                <div className="px-4 pb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("All");
                      setMinPrice("");
                      setMaxPrice("");
                      setSort("featured");
                    }}
                    className="px-4 py-2 text-sm font-extrabold border border-black/15 bg-black/5 hover:bg-black/10 transition"
                    style={{ borderRadius: 0 }}
                  >
                    Reset
                  </button>

                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="px-4 py-2 text-sm font-extrabold text-white transition"
                    style={{ borderRadius: 0, backgroundColor: BRAND_RED }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-8 border border-red-500/25 bg-red-500/15 px-4 py-3 text-white/90" style={{ textShadow: subShadow }}>
            <div className="font-extrabold">Supabase error:</div>
            <div className="mt-1">{errorMsg}</div>
            <button
              onClick={fetchProducts}
              className="mt-3 px-4 py-2 text-sm font-extrabold text-white border border-white/25 bg-white/10 hover:bg-white/15 transition"
              style={{ borderRadius: 0 }}
            >
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-8 text-white/80" style={{ textShadow: subShadow }}>
            Loading products...
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="mt-8 text-white/80" style={{ textShadow: subShadow }}>
            No products match your filters.
          </div>
        )}

        {/* ✅ EXACT grid + blocks like BulkHerbal */}
        <div className="mt-7 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredProducts.map((p, idx) => {
            const img = getBestImage(p);
            const stockOk = isInStock(p);

            const variants = normalizeVariants(p);
            const hasVariants = variants.length > 0;

            const selectedId = selectedVariantByProduct[p.id];
            const selectedVariant =
              hasVariants && selectedId
                ? variants.find((v) => v.id === selectedId) ?? variants[0]
                : null;

            const displayPrice = hasVariants
              ? selectedVariant?.price ?? variants[0]?.price ?? Number(p.price ?? 0)
              : Number(p.price ?? 0);

            return (
              <div
                key={p.id}
                className={[
                  "relative overflow-hidden",
                  "bg-white/90 backdrop-blur",
                  "border border-black/12",
                  "shadow-[0_8px_18px_rgba(0,0,0,0.10)]",
                  "hover:shadow-[0_12px_26px_rgba(0,0,0,0.14)]",
                  "transition-shadow",
                  "rounded-none",
                ].join(" ")}
              >
                {/* Stock badge */}
                <div className="absolute right-2 top-2 z-10">
                  {stockOk ? (
                    <span
                      className="inline-flex items-center justify-center px-2 py-1 text-[9px] font-extrabold tracking-widest text-white shadow-sm"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      IN&nbsp;STOCK
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center justify-center px-2 py-1 text-[9px] font-extrabold tracking-widest text-white shadow-sm"
                      style={{ backgroundColor: BRAND_RED }}
                    >
                      OUT&nbsp;OF&nbsp;STOCK
                    </span>
                  )}
                </div>

                {/* Image area */}
                <button
                  type="button"
                  onClick={() => openPopup(p, idx)}
                  className="relative block w-full aspect-square bg-black/5 border-b border-black/10"
                  title="Quick view"
                >
                  {img ? (
                    <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-[10px] text-black/45">
                      No image yet
                    </div>
                  )}
                </button>

                {/* Bottom */}
                <div className="p-2.5">
                  <button type="button" onClick={() => openPopup(p, idx)} className="w-full text-left" title="Quick view">
                    <h3 className="text-[12px] font-extrabold tracking-tight text-black leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                  </button>

                  {/* Variants (radio row) only if exist */}
                  {hasVariants && (
                    <div className="mt-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {variants.map((v) => {
                          const selected = (selectedVariant?.id ?? variants[0].id) === v.id;

                          return (
                            <label
                              key={v.id}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-black/70 cursor-pointer select-none"
                              title={`${shortVariantLabel(v)} · ${formatZar(v.price)}`}
                            >
                              <input
                                type="radio"
                                name={`variant_${p.id}`}
                                className="sr-only"
                                checked={selected}
                                onChange={() =>
                                  setSelectedVariantByProduct((prev) => ({
                                    ...prev,
                                    [p.id]: v.id,
                                  }))
                                }
                              />
                              <span
                                className="h-2.5 w-2.5 border border-black/40 grid place-items-center"
                                style={{ borderRadius: 9999 }}
                              >
                                {selected && (
                                  <span
                                    className="h-1.5 w-1.5"
                                    style={{ borderRadius: 9999, backgroundColor: BRAND_RED }}
                                  />
                                )}
                              </span>
                              <span>{shortVariantLabel(v)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Price (red) */}
                  <div className="mt-2">
                    <div className="text-[9px] uppercase tracking-widest text-black/45">
                      {hasVariants ? "From" : "Price"}
                    </div>
                    <div className="text-[18px] font-extrabold leading-none" style={{ color: BRAND_RED }}>
                      {formatZar(displayPrice)}
                    </div>
                  </div>

                  {/* Button */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasVariants) {
                          const v = selectedVariant ?? variants[0];
                          return addToCart({ product: p, qty: 1, variant: v });
                        }
                        return addToCart({ product: p, qty: 1, variant: null });
                      }}
                      disabled={!stockOk}
                      className={[
                        "w-full inline-flex items-center justify-center px-2 py-2",
                        "text-[12px] font-extrabold transition",
                        stockOk ? "text-white" : "bg-black/10 text-black/40 cursor-not-allowed",
                        "rounded-none",
                      ].join(" ")}
                      style={stockOk ? { backgroundColor: BRAND_BLUE } : undefined}
                    >
                      {stockOk ? "Add to cart" : "Out of stock"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup */}
      {active && (
        <ProductQuickView
          product={active as any}
          onAddToCart={addToCart}
          open={open}
          onOpenChange={(next: boolean) => {
            setOpen(next);
            if (!next) setActive(null);
          }}
          hideCard
          accent={activeAccent}
        />
      )}
    </main>
  );
}