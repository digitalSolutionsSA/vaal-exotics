import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import growBg from "../../assets/grow-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";
import ProductQuickView from "../../components/ProductQuickView";

const CAT = CATEGORY.growkits;

// Brand accents
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
  category: string;
  price: number;
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

  // If stock_count exists, enforce it. Otherwise fall back to in_stock.
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

function fromPrice(p: ShopProduct) {
  const variants = normalizeVariants(p);
  if (!variants.length) return Number(p.price ?? 0);
  return Math.min(...variants.map((v) => v.price));
}

function shortVariantLabel(v: ProductVariant) {
  return `${v.size}${v.unit.toUpperCase()}`;
}

export default function GrowKits() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Controlled popup state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ShopProduct | null>(null);
  const [activeAccent, setActiveAccent] = useState<"red" | "blue">("blue");

  // ✅ Selected variant per product (radio selection)
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,category,price,description,in_stock,stock_count,image_url,images,variants,created_at"
        )
        .eq("category", CAT)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("GrowKits fetch error:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as ShopProduct[];
      setProducts(list);

      // ✅ default to cheapest variant (if exists)
      const seed: Record<string, string> = {};
      for (const p of list) {
        const vars = normalizeVariants(p);
        if (vars.length) seed[p.id] = vars[0].id;
      }
      setSelectedVariantByProduct(seed);

      setLoading(false);
    };

    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const want = normCategory(CAT);
    return products.filter((p) => normCategory(p?.category) === want);
  }, [products]);

  const openPopup = (p: ShopProduct, idx: number) => {
    setActive(p);
    setActiveAccent(idx % 2 === 0 ? "blue" : "red");
    setOpen(true);
  };

  const addToCart = ({ product, qty, variant }: any) => {
    // Replace this with your real cart context call
    console.log("ADD TO CART:", { productId: product.id, qty, variant });
  };

  return (
    <main className="relative min-h-screen text-black">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${growBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="fixed inset-0 z-0 bg-white/55 pointer-events-none" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.85)_55%,rgba(255,255,255,0.95)_100%)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-6 sm:px-10 xl:px-16 pt-16 pb-20">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-black/50">
          Mushrooms
        </p>

        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Mushroom Grow Kits
        </h1>

        <p className="mt-3 max-w-2xl text-black/70">
          Beginner-friendly kits designed for clean home harvests.
        </p>

        {loading && <div className="mt-8 text-black/60">Loading products...</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="mt-8 text-black/60">No products in this category yet.</div>
        )}

        {/* ✅ Smaller tiles, dense grid */}
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

            // ✅ If no variants: use product price directly
            const displayPrice = hasVariants
              ? selectedVariant?.price ?? fromPrice(p)
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
                    <img
                      src={img}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-[10px] text-black/45">
                      No image yet
                    </div>
                  )}
                </button>

                {/* Bottom */}
                <div className="p-2.5">
                  <button
                    type="button"
                    onClick={() => openPopup(p, idx)}
                    className="w-full text-left"
                    title="Quick view"
                  >
                    <h3 className="text-[12px] font-extrabold tracking-tight text-black leading-snug line-clamp-2">
                      {p.name}
                    </h3>
                  </button>

                  {/* ✅ Variants only if they exist */}
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

                              {/* custom radio */}
                              <span
                                className="h-2.5 w-2.5 border border-black/40 grid place-items-center"
                                style={{ borderRadius: 9999 }}
                              >
                                {selected && (
                                  <span
                                    className="h-1.5 w-1.5"
                                    style={{
                                      borderRadius: 9999,
                                      backgroundColor: BRAND_RED,
                                    }}
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
                    <div
                      className="text-[18px] font-extrabold leading-none"
                      style={{ color: BRAND_RED }}
                    >
                      {formatZar(displayPrice)}
                    </div>
                  </div>

                  {/* ✅ Full-width blue button: disabled ONLY when out of stock */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasVariants) {
                          const v = selectedVariant ?? variants[0];
                          return addToCart({ product: p, qty: 1, variant: v });
                        }
                        // no variants = normal product
                        return addToCart({ product: p, qty: 1, variant: null });
                      }}
                      disabled={!stockOk}
                      className={[
                        "w-full inline-flex items-center justify-center px-2 py-2",
                        "text-[12px] font-extrabold transition",
                        stockOk
                          ? "text-white"
                          : "bg-black/10 text-black/40 cursor-not-allowed",
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

      {/* Popup still available by clicking image/title */}
      {active && (
        <ProductQuickView
          product={active as any}
          onAddToCart={addToCart}
          open={open}
          onOpenChange={(next) => {
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
