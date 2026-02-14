import { useState } from "react";
import { useEffect } from "react";
import { useMemo } from "react";
import { useRef } from "react";

import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import productsBg from "../assets/products-bg.png";
import { supabase } from "../lib/supabase";
import ProductQuickView from "../components/ProductQuickView";
import { useCart } from "../context/cart";

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

function formatZar(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function normCategory(input: any) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
}

function normalizeProductRow(p: any) {
  const basePrice = Number(p?.price);
  const hasBase = Number.isFinite(basePrice) && basePrice > 0;

  const centsRaw = p?.price_cents;
  const centsNum =
    centsRaw === null || centsRaw === undefined ? NaN : Number(centsRaw);

  const hasCents = Number.isFinite(centsNum) && centsNum > 0;

  // Variants fallback (optional but good)
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  const variantPrices = variants
    .map((v: any) => Number(v?.price))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  const fromVariants = variantPrices.length ? Math.min(...variantPrices) : NaN;

  const price = hasBase
    ? basePrice
    : hasCents
    ? centsNum / 100
    : Number.isFinite(fromVariants)
    ? fromVariants
    : 0;

  return { ...p, variants, price };
}


export default function Products() {
  const cart: any = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("featured");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Only show active products to customers
  const BULK_CATEGORY = "Bulk Herbal Products";
  const bulkNorm = normCategory(BULK_CATEGORY);

  const fetchProducts = async () => {
    setLoading(true);
    setErrorMsg("");

    // ✅ IMPORTANT: match your table schema (price_cents exists, active does NOT)
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,category,price,price_cents,description,image_url,images,variants,stock_count,created_at")

      // If you want to show only items currently for sale, keep this:
      // 
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products fetch error:", error);
      setProducts([]);
      setErrorMsg(error.message || "Failed to load products (check RLS/policies).");
      setLoading(false);
      return;
    }

    const cleaned = (data ?? [])
      .map(normalizeProductRow)
      .filter((p: any) => {
        // 🚫 HARD exclude Bulk Herbal from All Products page
        if (normCategory(p?.category) === bulkNorm) return false;
        return true;
      });

    setProducts(cleaned);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
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
      if (!filtersOpen) return;
      if (e.key === "Escape") setFiltersOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtersOpen]);

  // Build category list with normalization so duplicates don't show up
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number(minPrice);
    const max = maxPrice.trim() === "" ? null : Number(maxPrice);

    const selectedCatNorm = category === "All" ? "all" : normCategory(category);

    let list = (products as any[]).filter((p: any) => {
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

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSort("featured");
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

  return (
    <section
      className="relative min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${productsBg})` }}
    >
      <div className="absolute inset-0 bg-black/75" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl" style={{ fontFamily: "Montserrat, sans-serif" }}>
              VIEW PRODUCTS
            </h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              All categories in one place. Filter by category, price and search.
            </p>
          </div>

          {/* Right controls */}
          <div className="relative flex items-center gap-2 sm:gap-3" ref={dropdownRef}>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              aria-expanded={filtersOpen}
              aria-haspopup="true"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              Back to Home
            </Link>

            {filtersOpen && (
              <div className="absolute right-0 top-12 z-50 w-[min(92vw,720px)] rounded-2xl border border-white/10 bg-black/90 p-5 backdrop-blur shadow-2xl">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-white/90">Filters</div>
                  <div className="ml-auto text-xs text-white/60">
                    Price range: {formatZar(priceStats.min)}–{formatZar(priceStats.max)}
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="ml-2 rounded-lg border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="relative lg:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-black">
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortOption)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    >
                      <option value="featured" className="bg-black">
                        Featured
                      </option>
                      <option value="price-asc" className="bg-black">
                        Price: Low → High
                      </option>
                      <option value="price-desc" className="bg-black">
                        Price: High → Low
                      </option>
                      <option value="name-asc" className="bg-black">
                        Name: A → Z
                      </option>
                      <option value="name-desc" className="bg-black">
                        Name: Z → A
                      </option>
                    </select>
                  </div>

                  <div>
                    <input
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      inputMode="numeric"
                      placeholder="Min price"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>

                  <div>
                    <input
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      inputMode="numeric"
                      placeholder="Max price"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={resetFilters}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                  >
                    Reset filters
                  </button>

                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-xl bg-[#C43A2F] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#a83228]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mt-8">
          <div className="mb-4 text-sm text-white/70">
            Showing <span className="font-semibold text-white">{filtered.length}</span> of{" "}
            <span className="font-semibold text-white">{products.length}</span> products
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              <div className="font-semibold">Supabase error:</div>
              <div className="mt-1 opacity-90">{errorMsg}</div>
              <button
                onClick={fetchProducts}
                className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
              Loading products...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
              No products match your filters.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p: any) => (
                <ProductQuickView key={p.id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
