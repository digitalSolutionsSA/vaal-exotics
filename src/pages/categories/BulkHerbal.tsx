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

function getImages(p: ShopProduct) {
  const imgs = safeArray<string>(p.images).filter(Boolean);
  if (imgs.length) return imgs;
  return p.image_url ? [p.image_url] : [];
}

function getBestImage(p: ShopProduct) {
  const imgs = getImages(p);
  return imgs?.[0] || "";
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

  const [quickViewProduct, setQuickViewProduct] = useState<ShopProduct | null>(null);
  const [quickViewImage, setQuickViewImage] = useState(0);

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

  useEffect(() => {
    if (!quickViewProduct) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [quickViewProduct]);

  const filteredProducts = useMemo(() => {
    const want = normCategory(CAT);
    return products.filter((p) => normCategory(p?.category) === want);
  }, [products]);

  const openQuickView = (p: ShopProduct) => {
    setQuickViewProduct(p);
    setQuickViewImage(0);

    const vars = normalizeVariants(p);
    if (vars.length && !selectedVariantByProduct[p.id]) {
      setSelectedVariantByProduct((prev) => ({
        ...prev,
        [p.id]: vars[0].id,
      }));
    }
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
    setQuickViewImage(0);
  };

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

    const numberToUse = OWNER_WHATSAPP || "";
    const url = buildWhatsappUrl(numberToUse, message);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const quickViewVariants = quickViewProduct ? normalizeVariants(quickViewProduct) : [];
  const quickViewSelectedId = quickViewProduct
    ? selectedVariantByProduct[quickViewProduct.id]
    : "";
  const quickViewSelectedVariant =
    quickViewProduct && quickViewVariants.length
      ? quickViewVariants.find((v) => v.id === quickViewSelectedId) ?? quickViewVariants[0]
      : null;
  const quickViewPrice = quickViewProduct
    ? quickViewSelectedVariant?.price ?? Number(quickViewProduct.price ?? 0)
    : 0;
  const quickViewImages = quickViewProduct ? getImages(quickViewProduct) : [];

  return (
    <main className="relative min-h-screen text-black">
      {/* Background */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${herbalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-[2400px] px-3 sm:px-4 lg:px-6 pt-14 sm:pt-16 pb-[170px] sm:pb-[190px]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              Bulk Herbal Products
            </h1>
            <p className="mt-2 text-white/80 text-xs sm:text-sm">
              Add items to your enquiry list, then send via WhatsApp.
            </p>
          </div>
        </div>

        {loading && <div className="mt-6 text-white">Loading products...</div>}

        <div
          className="
            mt-6
            grid
            gap-2 sm:gap-3 lg:gap-3
            [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]
            sm:[grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]
            md:[grid-template-columns:repeat(auto-fill,minmax(175px,1fr))]
            lg:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]
            xl:[grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]
          "
        >
          {filteredProducts.map((p) => {
            const img = getBestImage(p);
            const variants = normalizeVariants(p);
            const selectedId = selectedVariantByProduct[p.id];
            const selectedVariant =
              variants.length && selectedId
                ? variants.find((v) => v.id === selectedId) ?? variants[0]
                : null;

            const displayPrice = selectedVariant?.price ?? Number(p.price ?? 0);
            const desc = shortDesc(p.description);

            return (
              <div
                key={p.id}
                className="
                  bg-white
                  border border-gray-200
                  shadow-sm
                  rounded-xl
                  overflow-hidden
                  flex flex-col
                  h-full
                "
              >
                <button
                  type="button"
                  onClick={() => openQuickView(p)}
                  className="aspect-[4/3] bg-black/5 border-b border-black/10 block text-left"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-black/40">
                      No image
                    </div>
                  )}
                </button>

                <div
                  className="
                    p-2.5 sm:p-3
                    flex-1
                    grid
                    grid-rows-[auto_auto_auto_auto_1fr_auto]
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() => openQuickView(p)}
                    className="text-left text-[12px] sm:text-sm font-extrabold leading-snug line-clamp-2 hover:opacity-80"
                  >
                    {p.name}
                  </button>

                  <div className="min-h-[32px]">
                    {desc ? (
                      <p className="text-[11px] sm:text-xs text-black/60 leading-snug line-clamp-2">
                        {desc}
                      </p>
                    ) : (
                      <div className="h-[32px]" />
                    )}
                  </div>

                  <div className="min-h-[56px]">
                    {variants.length > 0 ? (
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
                      <div className="h-[56px]" />
                    )}
                  </div>

                  <div className="text-base sm:text-lg font-extrabold text-red-700">
                    {formatZar(displayPrice)}
                  </div>

                  <div />

                  <div className="pt-1 space-y-1.5">
                    <button
                      onClick={() => addToEnquiry(p)}
                      className="w-full py-2 text-[11px] sm:text-xs font-extrabold text-white rounded-md"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      Add to enquiry
                    </button>

                    <button
                      type="button"
                      onClick={() => openQuickView(p)}
                      className="w-full py-2 text-[11px] sm:text-xs font-extrabold rounded-md border border-black/10 bg-white text-black"
                    >
                      Quick view
                    </button>

                    <div className="text-[10px] text-black/45 text-center leading-snug">
                      Add items then send via WhatsApp.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky Enquiry Bar */}
        <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(760px,calc(100%-16px))]">
          <div className="bg-white/95 backdrop-blur border border-black/10 shadow-lg rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-extrabold text-black">
                  Enquiry cart: {cartCount} item{cartCount === 1 ? "" : "s"}
                </div>
                <div className="text-[10px] sm:text-[11px] text-black/60 truncate">
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

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] p-3 sm:p-4"
          onClick={closeQuickView}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
              <button
                type="button"
                onClick={closeQuickView}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-black shadow border border-black/10"
                aria-label="Close quick view"
              >
                ×
              </button>

              <div className="grid max-h-[92vh] grid-cols-1 md:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b md:border-b-0 md:border-r border-black/10 bg-[#f7f7f7]">
                  <div className="aspect-square w-full bg-white">
                    {quickViewImages[quickViewImage] ? (
                      <img
                        src={quickViewImages[quickViewImage]}
                        alt={quickViewProduct.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-black/40">
                        No image available
                      </div>
                    )}
                  </div>

                  {quickViewImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-black/10 bg-white p-3">
                      {quickViewImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setQuickViewImage(index)}
                          className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${
                            quickViewImage === index
                              ? "border-black"
                              : "border-black/10"
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${quickViewProduct.name} ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="max-h-[92vh] overflow-y-auto p-4 sm:p-5 md:p-6">
                  <div className="pr-10">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-black leading-tight">
                      {quickViewProduct.name}
                    </h2>

                    <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-red-700">
                      {formatZar(quickViewPrice)}
                    </div>

                    {quickViewProduct.description && (
                      <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.03] p-3">
                        <p className="text-sm sm:text-[15px] leading-6 text-black/75 whitespace-pre-wrap">
                          {quickViewProduct.description}
                        </p>
                      </div>
                    )}

                    {quickViewVariants.length > 0 && (
                      <div className="mt-4">
                        <label className="block text-xs font-bold uppercase tracking-wide text-black/55 mb-2">
                          Size
                        </label>
                        <select
                          value={quickViewSelectedVariant?.id ?? ""}
                          onChange={(e) =>
                            setSelectedVariantByProduct((prev) => ({
                              ...prev,
                              [quickViewProduct.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-sm outline-none"
                        >
                          {quickViewVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {shortVariantLabel(v)} · {formatZar(v.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => addToEnquiry(quickViewProduct)}
                        className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-extrabold text-white"
                        style={{ backgroundColor: BRAND_BLUE }}
                      >
                        Add to enquiry
                      </button>

                      <button
                        type="button"
                        onClick={closeQuickView}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-black"
                      >
                        Continue browsing
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-black/50">
                      Add items to your enquiry cart, then send the full list via WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}