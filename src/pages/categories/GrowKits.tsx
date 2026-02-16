import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import growBg from "../../assets/grow-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";
import ProductQuickView from "../../components/ProductQuickView";

const CAT = CATEGORY.growkits;

// Brand accents (close to your logo vibe)
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
    .filter((x) => x.size && Number.isFinite(x.price) && x.price > 0);
}

function fromPrice(p: ShopProduct) {
  const variants = normalizeVariants(p);
  if (!variants.length) return Number(p.price ?? 0);
  return Math.min(...variants.map((v) => v.price));
}

export default function GrowKits() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Controlled popup state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ShopProduct | null>(null);
  const [activeAccent, setActiveAccent] = useState<"red" | "blue">("blue");

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

      setProducts((data ?? []) as ShopProduct[]);
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
      <div className="fixed inset-0 z-0 bg-white/40 pointer-events-none" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.80)_55%,rgba(255,255,255,0.92)_100%)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10 xl:px-16 pt-16 pb-24">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50">
          Mushrooms
        </p>

        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Mushroom Grow Kits
        </h1>

        <p className="mt-4 max-w-2xl text-black/70">
          Beginner-friendly kits designed for clean home harvests.
        </p>

        {loading && <div className="mt-12 text-black/60">Loading products...</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="mt-12 text-black/60">No products in this category yet.</div>
        )}

        {/* Product blocks (UNCHANGED) */}
        <div className="mt-10 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p, idx) => {
            const img = getBestImage(p);
            const stockOk = isInStock(p);
            const price = fromPrice(p);
            const hasVariants = normalizeVariants(p).length > 0;

            const accentColor = idx % 2 === 0 ? BRAND_BLUE : BRAND_RED;

            return (
              <div
                key={p.id}
                className={[
                  "relative rounded-2xl bg-white/95 backdrop-blur",
                  "border border-black/10",
                  "shadow-[0_10px_30px_rgba(0,0,0,0.10)]",
                  "hover:shadow-[0_16px_45px_rgba(0,0,0,0.14)]",
                  "transition-shadow",
                  "overflow-hidden",
                ].join(" ")}
                style={{ borderLeft: `6px solid ${accentColor}` }}
              >
                <div className="p-4 flex gap-4">
                  {/* Image */}
                  <button
                    type="button"
                    onClick={() => openPopup(p, idx)}
                    className="relative shrink-0 w-[110px] sm:w-[130px] aspect-square rounded-xl bg-black/5 border border-black/10 overflow-hidden"
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
                      <div className="h-full w-full grid place-items-center text-xs text-black/50">
                        No image
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openPopup(p, idx)}
                      className="text-left w-full"
                      title="Quick view"
                    >
                      <h3 className="text-base font-extrabold tracking-tight text-black leading-snug line-clamp-2">
                        {p.name}
                      </h3>
                    </button>

                    <div className="mt-2">
                      <div className="text-[11px] uppercase tracking-widest text-black/45">From</div>
                      <div className="text-lg font-extrabold text-black">{formatZar(price)}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (hasVariants) return openPopup(p, idx);
                          if (stockOk) {
                            addToCart({ product: p, qty: 1, variant: null });
                          }
                        }}
                        disabled={!stockOk && !hasVariants}
                        className={[
                          "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-extrabold transition",
                          stockOk || hasVariants
                            ? "bg-black text-white hover:bg-black/90"
                            : "bg-black/10 text-black/40 cursor-not-allowed",
                        ].join(" ")}
                      >
                        Add to cart
                      </button>

                      <div className="shrink-0">
                        {stockOk ? (
                          <span
                            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-[11px] font-extrabold tracking-widest text-white shadow-sm"
                            style={{ backgroundColor: BRAND_BLUE }}
                          >
                            IN&nbsp;STOCK
                          </span>
                        ) : (
                          <span
                            className="inline-flex flex-col items-center justify-center rounded-xl px-3 py-2 text-[11px] font-extrabold tracking-widest text-white leading-[1.05] shadow-sm"
                            style={{ backgroundColor: BRAND_RED }}
                          >
                            <span>OUT&nbsp;OF</span>
                            <span>STOCK</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Popup only */}
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
