import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import herbalBg from "../../assets/new-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";

const CAT = CATEGORY.bulk;

// Brand accents
const BRAND_BLUE = "#2F4D7A";

// Optional: put this in .env as VITE_VAAL_EXOTICS_WHATSAPP=+27XXXXXXXXX (or 27XXXXXXXXX)
const OWNER_WHATSAPP =
  ((import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP as string | undefined) ||
  "";

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

type EnquiryCartItem = {
  key: string;
  productId: string;
  name: string;
  image?: string;
  qty: number;
  variant?: ProductVariant | null;
  basePrice: number;
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
  // e.g. "1KG" or "500L" (you can tweak formatting later)
  return `${v.size}${v.unit.toUpperCase()}`;
}

function shortDesc(desc: string | null | undefined, maxLen = 90) {
  const t = String(desc ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen).trim()}…` : t;
}

function sanitizeWhatsappNumber(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) return "";
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");
  return plus ? `+${digits}` : digits;
}

function buildWhatsappUrl(numberRaw: string, message: string) {
  const number = sanitizeWhatsappNumber(numberRaw);
  const encoded = encodeURIComponent(message);
  const waNumber = number.replace("+", "");
  return `https://wa.me/${waNumber}?text=${encoded}`;
}

export default function BulkHerbal() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVariantByProduct, setSelectedVariantByProduct] =
    useState<Record<string, string>>({});

  const [enquiryCart, setEnquiryCart] = useState<EnquiryCartItem[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,price,description,image_url,images,variants,created_at")
        .eq("category", CAT)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("BulkHerbal fetch error:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      const list = (data ?? []) as ShopProduct[];
      setProducts(list);

      // seed default variant per product
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

  const addToEnquiry = (p: ShopProduct) => {
    const variants = normalizeVariants(p);
    const selectedId = selectedVariantByProduct[p.id];
    const selectedVariant =
      variants.length && selectedId
        ? variants.find((v) => v.id === selectedId) ?? variants[0]
        : null;

    const key = `${p.id}|${selectedVariant?.id ?? "no_variant"}`;

    setEnquiryCart((prev) => {
      const existing = prev.find((x) => x.key === key);
      if (existing) {
        return prev.map((x) => (x.key === key ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...prev,
        {
          key,
          productId: p.id,
          name: p.name,
          image: getBestImage(p),
          qty: 1,
          variant: selectedVariant ?? null,
          basePrice: Number(p.price ?? 0),
        },
      ];
    });
  };

  const removeOne = (key: string) => {
    setEnquiryCart((prev) =>
      prev
        .map((x) => (x.key === key ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const clearEnquiry = () => setEnquiryCart([]);

  const cartCount = useMemo(
    () => enquiryCart.reduce((sum, x) => sum + (Number(x.qty) || 0), 0),
    [enquiryCart]
  );

  const cartTotal = useMemo(() => {
    return enquiryCart.reduce((sum, x) => {
      const unitPrice = x.variant?.price ?? x.basePrice ?? 0;
      return sum + unitPrice * (x.qty || 0);
    }, 0);
  }, [enquiryCart]);

  const sendEnquiryWhatsapp = () => {
    if (!enquiryCart.length) return;

    const lines = enquiryCart.map((x) => {
      const v = x.variant ? ` (${shortVariantLabel(x.variant)})` : "";
      const unitPrice = x.variant?.price ?? x.basePrice ?? 0;
      return `• ${x.qty} × ${x.name}${v} — ${formatZar(unitPrice)}`;
    });

    const message =
      `Hi Vaal Exotics, I'd like to enquire about the following bulk herbal items:\n\n` +
      lines.join("\n") +
      `\n\nEstimated total: ${formatZar(cartTotal)}\n\n` +
      `Please confirm availability and final pricing. Thanks!`;

    const numberToUse = OWNER_WHATSAPP || ""; // if empty, wa.me still opens but won't target a chat
    const url = buildWhatsappUrl(numberToUse, message);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <main className="relative min-h-screen text-black">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${herbalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-6 pt-16 pb-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white">Bulk Herbal Products</h1>
            <p className="mt-2 text-white/80 text-sm">
              Add items to your enquiry list, then send via WhatsApp.
            </p>
          </div>
        </div>

        {loading && <div className="mt-8 text-white">Loading products...</div>}

        <div className="mt-7 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredProducts.map((p) => {
            const img = getBestImage(p);
            const variants = normalizeVariants(p);
            const selectedId = selectedVariantByProduct[p.id];
            const selectedVariant =
              variants.length && selectedId
                ? variants.find((v) => v.id === selectedId) ?? variants[0]
                : null;

            const displayPrice = selectedVariant?.price ?? Number(p.price ?? 0);

            return (
              <div
                key={p.id}
                className="bg-white/90 border border-black/10 shadow flex flex-col h-full"
              >
                <div className="aspect-square bg-black/5 border-b border-black/10">
                  {img && (
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-extrabold line-clamp-2">{p.name}</h3>

                  {shortDesc(p.description) && (
                    <p className="mt-1 text-xs text-black/60 line-clamp-2">
                      {shortDesc(p.description)}
                    </p>
                  )}

                  {/* Variant selector (only if variants exist) */}
                  {variants.length > 0 && (
                    <div className="mt-2">
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
                  )}

                  <div className="mt-2 text-lg font-extrabold text-red-700">
                    {formatZar(displayPrice)}
                  </div>

                  {/* Pinned bottom section */}
                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => addToEnquiry(p)}
                      className="w-full py-2 text-xs font-extrabold text-white rounded-md"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      Add to enquiry
                    </button>

                    <div className="mt-1 text-[10px] text-black/50 text-center">
                      Add items then send via WhatsApp.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Enquiry Bar (mobile-friendly, always visible) */}
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(680px,calc(100%-24px))]">
          <div className="bg-white/95 backdrop-blur border border-black/10 shadow-lg rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-black">
                  Enquiry cart: {cartCount} item{cartCount === 1 ? "" : "s"}
                </div>
                <div className="text-[11px] text-black/60 truncate">
                  Estimated total: {formatZar(cartTotal)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearEnquiry}
                  disabled={!enquiryCart.length}
                  className="px-3 py-2 rounded-xl text-[11px] font-extrabold border border-black/10 disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  onClick={sendEnquiryWhatsapp}
                  disabled={!enquiryCart.length}
                  className="px-3 py-2 rounded-xl text-[11px] font-extrabold text-white disabled:opacity-50"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  Send WhatsApp
                </button>
              </div>
            </div>

            {/* Tiny removable list (only if items exist) */}
            {enquiryCart.length > 0 && (
              <div className="mt-2 max-h-28 overflow-auto">
                <div className="space-y-1">
                  {enquiryCart.map((x) => (
                    <div key={x.key} className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-black/75 min-w-0 truncate">
                        {x.qty} × {x.name}
                        {x.variant ? ` (${shortVariantLabel(x.variant)})` : ""}
                      </div>
                      <button
                        onClick={() => removeOne(x.key)}
                        className="text-[11px] font-extrabold text-red-700 px-2 py-1"
                        aria-label="Remove one"
                      >
                        −
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!OWNER_WHATSAPP && (
              <p className="mt-2 text-[10px] text-black/45">
                Tip: set <span className="font-semibold">VITE_VAAL_EXOTICS_WHATSAPP</span> in
                Netlify env vars to open the chat directly.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}