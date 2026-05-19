import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import herbalBg from "../../assets/new-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";

const CAT = CATEGORY.bulk;

// Brand accents
const BRAND_BLUE = "#2F4D7A";
const BRAND_RED = "#C43A2F";

// Always fall back to the Vaal Exotics number if env var is missing
const DEFAULT_OWNER_WHATSAPP = "27782166865";

const OWNER_WHATSAPP =
  ((import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP as string | undefined) ||
  DEFAULT_OWNER_WHATSAPP;

type VariantUnit = "kg" | "l" | "ml";

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

type TransformOptions = {
  width: number;
  height: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
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

function normalizeVariants(p: ShopProduct): ProductVariant[] {
  const v = safeArray<any>(p.variants);

  return v
    .filter(Boolean)
    .map((x: any, i: number) => {
      const rawUnit = String(x?.unit ?? "")
        .trim()
        .toLowerCase();

      const unit: VariantUnit =
        rawUnit === "kg" ? "kg" : rawUnit === "ml" ? "ml" : "l";

      return {
        id: String(x.id ?? `${p.id}_${i}`),
        unit,
        size: String(x.size ?? "").trim(),
        price: Number(x.price ?? 0),
      };
    })
    .filter((x) => x.size && Number.isFinite(x.price) && x.price > 0)
    .sort((a, b) => a.price - b.price);
}

function shortVariantLabel(v: ProductVariant) {
  const size = String(v.size ?? "").trim();
  const unit = String(v.unit ?? "").trim().toLowerCase();
  const lower = size.toLowerCase();

  if (lower.endsWith("kg") || lower.endsWith("l") || lower.endsWith("ml")) {
    return size.toUpperCase();
  }

  return `${size}${unit}`.toUpperCase();
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
  const waNumber = number.replace("+", "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${waNumber}?text=${encoded}`;
}

function toSupabaseRenderUrl(src: string, options: TransformOptions) {
  if (!src) return "";

  const trimmed = src.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);

    const marker = "/storage/v1/object/public/";
    const idx = url.pathname.indexOf(marker);

    if (idx === -1) {
      return trimmed;
    }

    const remainder = url.pathname.slice(idx + marker.length);
    const slashIndex = remainder.indexOf("/");

    if (slashIndex === -1) {
      return trimmed;
    }

    const bucket = remainder.slice(0, slashIndex);
    const objectPath = remainder.slice(slashIndex + 1);

    if (!bucket || !objectPath) {
      return trimmed;
    }

    const params = new URLSearchParams();
    params.set("width", String(options.width));
    params.set("height", String(options.height));
    params.set("quality", String(options.quality ?? 70));
    params.set("resize", options.resize ?? "cover");

    return `${url.origin}/storage/v1/render/image/public/${bucket}/${objectPath}?${params.toString()}`;
  } catch {
    return trimmed;
  }
}

function getOptimizedImages(
  p: ShopProduct,
  options: TransformOptions = {
    width: 700,
    height: 700,
    quality: 70,
    resize: "contain",
  }
) {
  return getImages(p).map((img) => toSupabaseRenderUrl(img, options));
}

function getBestImage(
  p: ShopProduct,
  options: TransformOptions = {
    width: 700,
    height: 700,
    quality: 70,
    resize: "contain",
  }
) {
  const imgs = getOptimizedImages(p, options);
  return imgs?.[0] || "";
}

export default function BulkHerbal() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

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
    const q = searchQuery.trim().toLowerCase();

    let list = products.filter((p) => normCategory(p?.category) === want);

    if (q) {
      list = list.filter((p) => {
        const name = String(p.name ?? "").toLowerCase();
        const desc = String(p.description ?? "").toLowerCase();
        const category = String(p.category ?? "").toLowerCase();

        return name.includes(q) || desc.includes(q) || category.includes(q);
      });
    }

    const getDisplayPrice = (p: ShopProduct) => {
      const vars = normalizeVariants(p);
      return vars[0]?.price ?? Number(p.price ?? 0);
    };

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.created_at ?? "").getTime() -
            new Date(b.created_at ?? "").getTime()
          );

        case "price-low":
          return getDisplayPrice(a) - getDisplayPrice(b);

        case "price-high":
          return getDisplayPrice(b) - getDisplayPrice(a);

        case "name-asc":
          return String(a.name ?? "").localeCompare(String(b.name ?? ""));

        case "name-desc":
          return String(b.name ?? "").localeCompare(String(a.name ?? ""));

        case "newest":
        default:
          return (
            new Date(b.created_at ?? "").getTime() -
            new Date(a.created_at ?? "").getTime()
          );
      }
    });
  }, [products, searchQuery, sortBy]);

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
      const v = x.variant ? ` (${shortVariantLabel(x.variant)})` : " (1kg)";
      const unitPrice = x.variant?.price ?? x.basePrice ?? 0;
      return `• ${x.qty} × ${x.name}${v} — ${formatZar(unitPrice)}`;
    });

    const message =
      `Hi Vaal Exotics, I'd like to enquire about the following bulk herbal items:\n\n` +
      lines.join("\n") +
      `\n\nEstimated total: ${formatZar(cartTotal)}\n\n` +
      `Please confirm availability and final pricing. Thanks!`;

    const numberToUse = sanitizeWhatsappNumber(OWNER_WHATSAPP || DEFAULT_OWNER_WHATSAPP);

    if (!numberToUse) {
      console.error("No valid WhatsApp number configured for Vaal Exotics.");
      return;
    }

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

  const quickViewImages = quickViewProduct
    ? getOptimizedImages(quickViewProduct, {
        width: 1200,
        height: 1200,
        quality: 75,
        resize: "contain",
      })
    : [];

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
        <div className="flex flex-col gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
            <div>
              <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white/75">
                Search products
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-black outline-none placeholder:text-black/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wide text-white/75">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/95 px-4 py-3 text-sm text-black outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price-low">Price: Low to high</option>
                <option value="price-high">Price: High to low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          <div className="text-white/85 text-xs sm:text-sm">
            Showing {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
          </div>
        </div>

        {loading && <div className="mt-6 text-white">Loading products...</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-6 text-center text-white">
            <div className="text-lg font-extrabold">No products found</div>
            <p className="mt-2 text-sm text-white/80">
              Try a different search term or change the sorting.
            </p>
          </div>
        )}

        <div
          className="
            mt-6
            grid
            gap-2 sm:gap-3 lg:gap-3
            [grid-template-columns:repeat(auto-fill,minmax(145px,1fr))]
            sm:[grid-template-columns:repeat(auto-fill,minmax(170px,1fr))]
            md:[grid-template-columns:repeat(auto-fill,minmax(185px,1fr))]
            lg:[grid-template-columns:repeat(auto-fill,minmax(195px,1fr))]
            xl:[grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]
          "
        >
          {filteredProducts.map((p, index) => {
            const img = getBestImage(p, {
              width: 700,
              height: 700,
              quality: 70,
              resize: "contain",
            });

            const variants = normalizeVariants(p);
            const selectedId = selectedVariantByProduct[p.id];
            const selectedVariant =
              variants.length && selectedId
                ? variants.find((v) => v.id === selectedId) ?? variants[0]
                : null;

            const displayPrice = selectedVariant?.price ?? Number(p.price ?? 0);
            const desc = shortDesc(p.description);
            const hasVariants = variants.length > 0;

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
                  min-w-0
                "
              >
                <button
                  type="button"
                  onClick={() => openQuickView(p)}
                  className="block text-left border-b border-black/10 bg-white relative"
                >
                  <div className="aspect-square sm:aspect-[4/3] w-full bg-white p-2 sm:p-3">
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-contain"
                        loading={index < 4 ? "eager" : "lazy"}
                        fetchPriority={index < 4 ? "high" : "auto"}
                        decoding="async"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, 220px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-black/40">
                        No image
                      </div>
                    )}
                  </div>

                  {/* 1kg badge — only shown when no variants */}
                  {!hasVariants && (
                    <span
                      className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white tracking-wide"
                      style={{ backgroundColor: BRAND_BLUE }}
                    >
                      1kg
                    </span>
                  )}
                </button>

                <div
                  className="
                    p-2.5 sm:p-3
                    flex-1
                    grid
                    grid-rows-[auto_auto_auto_auto_1fr_auto]
                    gap-2
                    min-w-0
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
                      /* Flat 1kg size pill replacing the empty space */
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold text-black/50">Size</span>
                        <span
                          className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border"
                          style={{ borderColor: BRAND_BLUE + "40", color: BRAND_BLUE }}
                        >
                          1kg
                        </span>
                      </div>
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
                        {x.variant ? ` (${shortVariantLabel(x.variant)})` : " (1kg)"}
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

            <p className="mt-2 text-[10px] text-black/45">
              Enquiries will be sent directly to Vaal Exotics on WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={closeQuickView}
        >
          <div
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:max-w-4xl md:flex-row"
            style={{ maxHeight: "82dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prominent close */}
            <button
              type="button"
              onClick={closeQuickView}
              aria-label="Close"
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95"
              style={{ backgroundColor: BRAND_RED }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Image panel */}
            <div className="shrink-0 bg-[#F6F5F2] md:w-[45%]">
              <div className="h-44 w-full overflow-hidden md:h-full">
                {quickViewImages[quickViewImage] ? (
                  <img
                    src={quickViewImages[quickViewImage]}
                    alt={quickViewProduct.name}
                    className="h-full w-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-black/30">
                    No image available
                  </div>
                )}
              </div>

              {quickViewImages.length > 1 && (
                <div className="hidden gap-2 overflow-x-auto border-t border-black/[0.06] bg-white/50 px-3 py-2 md:flex">
                  {quickViewImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setQuickViewImage(index)}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl transition-all ${
                        quickViewImage === index
                          ? "ring-2 ring-black/70 ring-offset-1 opacity-100"
                          : "opacity-50 hover:opacity-75"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${quickViewProduct.name} ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details panel */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pr-12 md:p-6 md:pr-14">
              <h2 className="text-[15px] font-extrabold leading-snug text-black md:text-xl">
                {quickViewProduct.name}
              </h2>

              <div className="mt-1 text-xl font-black tracking-tight" style={{ color: BRAND_RED }}>
                {formatZar(quickViewPrice)}
              </div>

              <div className="my-3 h-px bg-black/[0.07]" />

              {quickViewProduct.description && (
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-black/55 md:text-sm">
                  {quickViewProduct.description}
                </p>
              )}

              {quickViewVariants.length > 0 ? (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-black/35">
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
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none"
                  >
                    {quickViewVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {shortVariantLabel(v)} · {formatZar(v.price)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* 1kg pill in the quick view modal */
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/35">
                    Size
                  </span>
                  <span
                    className="px-3 py-1 rounded-lg text-[12px] font-extrabold border"
                    style={{ borderColor: BRAND_BLUE + "40", color: BRAND_BLUE }}
                  >
                    1kg
                  </span>
                </div>
              )}

              <div className="flex-1" />

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => { addToEnquiry(quickViewProduct); closeQuickView(); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-extrabold text-white transition active:scale-[0.98]"
                  style={{ backgroundColor: BRAND_BLUE }}
                >
                  Add to enquiry
                </button>

                <button
                  type="button"
                  onClick={closeQuickView}
                  className="flex w-full items-center justify-center rounded-xl border border-black/10 py-2.5 text-[12.5px] font-semibold text-black/50 transition hover:text-black/75 active:scale-[0.98]"
                >
                  Continue browsing
                </button>
              </div>

              <p className="mt-3 text-center text-[11px] text-black/30">
                Add items to your enquiry list, then send via WhatsApp.
              </p>

              <div className="h-1" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}