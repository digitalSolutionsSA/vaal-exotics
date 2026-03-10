import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import growBg from "../../assets/new-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";
import ProductQuickView from "../../components/ProductQuickView";
import { useCart } from "../../context/cart";

const CAT = CATEGORY.growkits;

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
  description?: string | null;
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

function shortDesc(desc: string | null | undefined, maxLen = 68) {
  const t = String(desc ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen).trim()}…` : t;
}

function parseSizeNumber(size: string) {
  const cleaned = String(size).trim().replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function computeChargeableKgFromVariant(variant: ProductVariant | null) {
  if (!variant) return 1;

  const amount = parseSizeNumber(variant.size);

  if (variant.unit === "kg") return amount > 0 ? amount : 1;
  if (variant.unit === "l") return amount > 0 ? amount : 1;

  return 1;
}

export default function GrowKits() {
  const cart = useCart();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ShopProduct | null>(null);
  const [activeAccent, setActiveAccent] = useState<"red" | "blue">("blue");

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

      const list = (data ?? []).map((row: any) => ({
        ...row,
        description: row?.description ?? null,
      })) as ShopProduct[];

      setProducts(list);

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

  const addToCart = ({
    product,
    qty,
    variant,
  }: {
    product: ShopProduct;
    qty: number;
    variant?: ProductVariant | null;
  }) => {
    const q = Math.max(1, Number(qty || 1));
    const v = variant ?? null;

    const priceRaw = Number(v?.price ?? product.price ?? 0);
    const price = Number.isFinite(priceRaw) ? priceRaw : 0;

    const chargeableKg = computeChargeableKgFromVariant(v);
    const itemId = `${product.id}:${v?.id ?? "base"}`;

    const item = {
      id: itemId,
      name: v ? `${product.name} (${shortVariantLabel(v)})` : product.name,
      price,
      qty: q,
      chargeableKg,
      productId: product.id,
      variantId: v?.id ?? null,
      variant: v,
      imageUrl: getBestImage(product),
    };

    const anyCart = cart as any;

    if (typeof anyCart.addItem === "function") {
      anyCart.addItem(item);
      return;
    }

    if (typeof anyCart.addToCart === "function") {
      anyCart.addToCart(item);
      return;
    }

    console.error(
      "Cart context has no addItem/addToCart. Check src/context/cart.tsx API.",
      cart
    );
  };

  return (
    <main className="relative min-h-screen text-black">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${growBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[2400px] px-4 sm:px-5 lg:px-6 pt-12 sm:pt-14 pb-20">
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white"
          style={{ textShadow: "0 6px 24px rgba(0,0,0,0.55)" }}
        >
          Mushroom Grow Kits
        </h1>

        <p
          className="mt-2 text-white/80 text-xs sm:text-sm"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
        >
          Beginner-friendly kits designed for clean home harvests.
        </p>

        {loading && (
          <div
            className="mt-6 text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
          >
            Loading products...
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div
            className="mt-6 text-white"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
          >
            No products in this category yet.
          </div>
        )}

        <div
          className="
            mt-6
            grid
            gap-3
            [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]
            sm:[grid-template-columns:repeat(auto-fill,minmax(175px,1fr))]
            lg:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]
            xl:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]
          "
        >
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
              ? selectedVariant?.price ?? fromPrice(p)
              : Number(p.price ?? 0);

            const desc = shortDesc(p.description);

            return (
              <div
                key={p.id}
                className="
                  bg-white
                  border border-gray-200
                  shadow-sm hover:shadow-md
                  rounded-xl
                  overflow-hidden
                  flex flex-col
                  h-full
                  group
                  transition-shadow
                "
              >
                <button
                  type="button"
                  onClick={() => openPopup(p, idx)}
                  className="relative block w-full aspect-square bg-[#f7f7f7] border-b border-black/10 p-3"
                  title="Quick view"
                >
                  <div className="w-full h-full rounded-lg bg-white border border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="w-[78%] h-[78%] object-contain transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] text-black/45">
                        No image yet
                      </div>
                    )}
                  </div>
                </button>

                <div className="p-3 flex-1 flex flex-col">
                  <button
                    type="button"
                    onClick={() => openPopup(p, idx)}
                    className="w-full text-left"
                    title="Quick view"
                  >
                    <h3 className="text-[13px] sm:text-[15px] font-extrabold leading-snug line-clamp-2 text-black">
                      {p.name}
                    </h3>
                  </button>

                  <div className="mt-2 min-h-[34px]">
                    {desc ? (
                      <p className="text-[11px] sm:text-xs text-black/55 leading-snug line-clamp-2">
                        {desc}
                      </p>
                    ) : (
                      <div className="h-[34px]" />
                    )}
                  </div>

                  <div className="mt-2 min-h-[58px]">
                    {hasVariants ? (
                      <div>
                        <label className="text-[10px] font-semibold text-black/60">
                          Size
                        </label>
                        <select
                          value={selectedVariant?.id ?? ""}
                          onChange={(e) =>
                            setSelectedVariantByProduct((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-2 text-xs outline-none"
                        >
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {shortVariantLabel(v)} · {formatZar(v.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-[58px]" />
                    )}
                  </div>

                  <div className="mt-2 text-[18px] font-extrabold leading-none text-red-700">
                    {formatZar(displayPrice)}
                  </div>

                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!stockOk) return;

                        if (hasVariants) {
                          const v = selectedVariant ?? variants[0];
                          return addToCart({ product: p, qty: 1, variant: v });
                        }

                        return addToCart({ product: p, qty: 1, variant: null });
                      }}
                      disabled={!stockOk}
                      className={[
                        "w-full py-2 text-[11px] sm:text-xs font-extrabold rounded-md",
                        stockOk
                          ? "text-white"
                          : "bg-black/10 text-black/40 cursor-not-allowed",
                      ].join(" ")}
                      style={stockOk ? { backgroundColor: BRAND_BLUE } : undefined}
                    >
                      {stockOk ? "Add to cart" : "Out of stock"}
                    </button>

                    <div className="mt-1 text-[10px] text-black/45 text-center leading-snug">
                      Add items to cart.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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