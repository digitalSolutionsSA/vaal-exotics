import { useEffect, useMemo, useState } from "react";

export type VariantUnit = "kg" | "l";

export type ProductVariant = {
  id: string;
  unit: VariantUnit;
  size: string;
  price: number;
};

export type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string | null;

  in_stock?: boolean | null;
  stock_count?: number | null;

  image_url?: string | null;
  images?: any; // jsonb array (or sometimes stringified JSON)
  variants?: any; // jsonb array

  created_at?: string;
};

const BULK_CATEGORY = "Bulk Herbal Products";

// Brand accents (logo-ish)
const BRAND_RED = "#C43A2F";
const BRAND_BLUE = "#2F4D7A";

const OWNER_WHATSAPP =
  (import.meta as any).env?.VITE_VAAL_EXOTICS_WHATSAPP ||
  (import.meta as any).env?.VITE_SHOP_WHATSAPP ||
  "";

function toWaDigits(n: string) {
  return String(n || "").replace(/[^\d]/g, "");
}

function formatZar(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function normalizeVariants(v: any): ProductVariant[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const id = String(x?.id ?? "");
      const unit = x?.unit === "l" ? "l" : x?.unit === "kg" ? "kg" : null;
      const size = String(x?.size ?? "").trim();
      const price = Number(x?.price);
      if (!id || !unit || !size || !Number.isFinite(price)) return null;
      return { id, unit, size, price } as ProductVariant;
    })
    .filter(Boolean) as ProductVariant[];
}

function coerceImages(raw: any): string[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      // ignore
    }
  }
  return arr.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0);
}

function getImages(p: ShopProduct): string[] {
  const arr = coerceImages(p.images);
  if (arr.length) return arr;

  const fallback = String(p.image_url ?? "").trim();
  if (fallback) return [fallback];

  return [];
}

function minVariantPrice(list: ProductVariant[]) {
  if (!list.length) return null;
  return Math.min(...list.map((v) => v.price));
}

type Props = {
  product: ShopProduct;
  onAddToCart?: (args: { product: ShopProduct; qty: number; variant?: ProductVariant | null }) => void;

  // ✅ controlled modal support
  open?: boolean;
  onOpenChange?: (next: boolean) => void;

  // ✅ if true, we don't render the card at all (modal-only)
  hideCard?: boolean;

  // ✅ optional accent colour
  accent?: "red" | "blue";
};

export default function ProductQuickView({
  product,
  onAddToCart,
  open,
  onOpenChange,
  hideCard = false,
  accent = "blue",
}: Props) {
  const images = useMemo(() => getImages(product), [product]);
  const variants = useMemo(() => normalizeVariants(product.variants), [product]);

  // internal state fallback if not controlled
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    if (open === undefined) setInternalOpen(next);
  };

  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const isBulkHerbal = String(product.category ?? "").trim() === BULK_CATEGORY;

  const stockCount = useMemo(() => {
    const n = Number(product.stock_count ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [product.stock_count]);

  const isInStock = useMemo(() => {
    // “reality” model: only true + stock_count > 0 counts as in stock
    const flag = product.in_stock === true;
    return flag && stockCount > 0;
  }, [product.in_stock, stockCount]);

  // Init default variant when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveImg(0);
    setQty(1);

    if (variants.length > 0) {
      setSelectedVariantId((prev) => prev || variants[0].id);
    } else {
      setSelectedVariantId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, variants.length, product.id]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [variants, selectedVariantId]);

  const displayPrice = useMemo(() => {
    const min = minVariantPrice(variants);
    if (min !== null) return { label: "From", value: min };
    return { label: "", value: Number(product.price) };
  }, [variants, product.price]);

  const exactPrice = useMemo(() => {
    if (variants.length > 0) return selectedVariant?.price ?? displayPrice.value;
    return displayPrice.value;
  }, [variants.length, selectedVariant, displayPrice.value]);

  const canAddToCart = useMemo(() => {
    if (isBulkHerbal) return false;
    if (!isInStock) return false;
    if (variants.length > 0 && !selectedVariant) return false;
    if (qty <= 0) return false;
    if (qty > stockCount) return false;
    return true;
  }, [isBulkHerbal, isInStock, variants.length, selectedVariant, qty, stockCount]);

  const accentColor = accent === "red" ? BRAND_RED : BRAND_BLUE;

  const openWhatsAppEnquiry = () => {
    const digits = toWaDigits(OWNER_WHATSAPP);
    if (!digits) {
      alert("Missing WhatsApp number. Set VITE_VAAL_EXOTICS_WHATSAPP in your .env file.");
      return;
    }
    const msg = `HI Vaal Exotics! I would like to enquire about ${product.name}.`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleAdd = () => {
    if (isBulkHerbal) {
      openWhatsAppEnquiry();
      setOpen(false);
      return;
    }
    if (!canAddToCart) return;
    onAddToCart?.({ product, qty, variant: selectedVariant });
    setOpen(false);
  };

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const setQtySafe = (next: number) => {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    const min = 1;
    const max = Math.max(1, stockCount || 1);
    setQty(Math.min(Math.max(min, Math.floor(n)), max));
  };

  return (
    <>
      {/* Optional CARD (hidden on GrowKits because you said popup only) */}
      {!hideCard && (
        <div className="group overflow-hidden rounded-2xl bg-white/95 backdrop-blur border border-black/10 shadow-[0_10px_30px_rgba(0,0,0,0.10)] hover:shadow-[0_16px_45px_rgba(0,0,0,0.14)] transition-shadow">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative block w-full text-left"
            title="View product"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-black/5">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                  No image yet
                </div>
              )}
            </div>
          </button>

          <div className="p-4">
            <h3 className="text-sm font-extrabold text-black leading-snug line-clamp-2">{product.name}</h3>
            <div className="mt-2 text-lg font-extrabold" style={{ color: accentColor }}>
              R{formatZar(displayPrice.value)}
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL: this is what you want to show when clicking a product */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />

          <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* LEFT: big image */}
              <div className="relative bg-black/[0.03]">
                <div className="aspect-square md:aspect-[4/5] w-full">
                  {images[activeImg] ? (
                    <img
                      src={images[activeImg]}
                      alt={product.name}
                      className="h-full w-full object-contain p-6"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-black/40">
                      No image yet
                    </div>
                  )}
                </div>

                {/* thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 px-6 pb-6">
                    {images.slice(0, 6).map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImg(idx)}
                        className={`h-14 w-14 overflow-hidden rounded-xl border transition ${
                          idx === activeImg ? "border-black/40" : "border-black/10 hover:border-black/25"
                        }`}
                        title={`Image ${idx + 1}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT: details */}
              <div className="p-7">
                <div className="mt-2 flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-extrabold tracking-tight text-black leading-snug">
                    {product.name}
                  </h2>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/60 hover:bg-black/5 transition"
                    aria-label="Close popup"
                  >
                    ✕
                  </button>
                </div>

                {/* price (brand blue/red) */}
                <div className="mt-3 text-xl font-extrabold" style={{ color: accentColor }}>
                  R{formatZar(exactPrice)}
                </div>

                <div className="mt-4 text-sm leading-relaxed text-black/70 whitespace-pre-wrap">
                  {product.description || "No description yet."}
                </div>

                {/* Variant dropdown */}
                {variants.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-semibold text-black/80">Variety/Species</div>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-black outline-none"
                      style={{ borderColor: accentColor }}
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.size}
                          {v.unit} • R{formatZar(v.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Qty + CTA row */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {!isBulkHerbal && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQtySafe(qty - 1)}
                        className="h-10 w-10 rounded-full border border-black/15 bg-white text-black/70 hover:bg-black/5"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <div className="min-w-[28px] text-center text-sm font-semibold text-black/70">
                        {qty}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQtySafe(qty + 1)}
                        className="h-10 w-10 rounded-full border border-black/15 bg-white text-black/70 hover:bg-black/5"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!isBulkHerbal && !canAddToCart}
                    onClick={handleAdd}
                    className="rounded-xl px-6 py-3 text-sm font-extrabold text-white transition disabled:opacity-40"
                    style={{
                      backgroundColor: accentColor,
                    }}
                  >
                    {isBulkHerbal ? "Enquire" : "Add To Basket"}
                  </button>
                </div>

                {/* out of stock message */}
                {!isBulkHerbal && !isInStock && (
                  <div className="mt-4 text-xs font-semibold" style={{ color: BRAND_RED }}>
                    This product is out of stock.
                  </div>
                )}

                {!isBulkHerbal && !canAddToCart && isInStock && (
                  <div className="mt-2 text-xs text-black/50">
                    {variants.length > 0 && !selectedVariant ? "Choose a variant first." : "Quantity exceeds stock."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
