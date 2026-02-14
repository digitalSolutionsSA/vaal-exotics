import { useEffect, useMemo, useRef, useState } from "react";
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

export default function Products() {
  const cart: any = useCart();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("featured");

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const BULK_CATEGORY = "Bulk Herbal Products";
  const bulkNorm = normCategory(BULK_CATEGORY);

  // ✅ Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,category,price,description,in_stock,stock_count,image_url,images,variants,created_at,active"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Products fetch error:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      // Filter active + exclude bulk herbal from All Products
      const cleaned = (data ?? []).filter((p: any) => {
        if (p?.active === false) return false;
        if (normCategory(p?.category) === bulkNorm) return false;
        return true;
      });

      setProducts(cleaned as any[]);
      setLoading(false);
    };

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

  // Category list
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
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

  // Filters + sort
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

  // ✅ Same callback signature your ProductQuickView uses
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
            <h1
              className="text-3xl font-extrabold text-white sm:text-4xl"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              VIEW PRODUCTS
            </h1>
            <p className="mt-2 text-sm text-white/70 sm:text-base">
              All categories in one place. Filter by category, price and search.
            </p>
          </div>

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
          {!loading && (
            <div className="mb-4 text-sm text-white/70">
              Showing <span className="font-semibold text-white">{filtered.length}</span> of{" "}
              <span className="font-semibold text-white">{products.length}</span> products
            </div>
          )}

          {loading ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
              Loading products...
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
              No products match your filters.
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p: any) => (
                <ProductQuickView
                  key={p.id}
                  // ✅ Normalize in_stock so TS + ProductQuickView stop crying
                  product={{ ...p, in_stock: !!p.in_stock }}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
