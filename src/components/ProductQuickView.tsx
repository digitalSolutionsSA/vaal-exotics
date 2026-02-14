import { useMemo, useState } from "react";

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

  // ✅ Match Supabase reality (nullable/optional)
  in_stock?: boolean | null;
  stock_count?: number | null;

  image_url?: string | null;
  images?: any; // jsonb array (or sometimes stringified JSON)
  variants?: any; // jsonb array

  created_at?: string;
};

const BULK_CATEGORY = "Bulk Herbal Products";

// ✅ Put the owner WhatsApp number in .env as:
// VITE_VAAL_EXOTICS_WHATSAPP=+27XXXXXXXXX  (or 27XXXXXXXXX)
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

  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
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
};

export default function ProductQuickView({ product, onAddToCart }: Props) {
  const images = useMemo(() => getImages(product), [product]);
  const variants = useMemo(() => normalizeVariants(product.variants), [product]);

  const [open, setOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const isBulkHerbal = String(product.category ?? "").trim() === BULK_CATEGORY;

  // ✅ Normalize stock values safely (prevents TS errors + runtime weirdness)
  const stockCount = useMemo(() => {
    const n = Number(product.stock_count ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [product.stock_count]);

  const isInStock = useMemo(() => {
    // If in_stock is null/undefined, treat it as false unless stockCount > 0
    const flag = product.in_stock === true;
    return flag && stockCount > 0;
  }, [product.in_stock, stockCount]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [variants, selectedVariantId]);

  const displayPrice = useMemo(() => {
    const min = minVariantPrice(variants);
    if (min !== null) return { label: "From", value: min };
    return { label: "", value: Number(product.price) };
  }, [variants, product.price]);

  const canAddToCart = useMemo(() => {
    // 🚫 Bulk Herbal is enquiry-only, never cart
    if (isBulkHerbal) return false;

    // ✅ Require BOTH: in_stock flag AND stock_count > 0
    if (!isInStock) return false;

    if (variants.length > 0 && !selectedVariant) return false;
    if (qty <= 0) return false;
    if (qty > stockCount) return false;
    return true;
  }, [isBulkHerbal, isInStock, variants.length, selectedVariant, qty, stockCount]);

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

  return (
    <>
      {/* CARD */}
      <div className="group overflow-hidden rounded-3xl bg-black shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
        {/* Image opens modal */}
        <button
          type="button"
          onClick={() => {
            setActiveImg(0);
            setOpen(true);
          }}
          className="relative block w-full"
          title="View product"
        >
          <div className="aspect-[4/3] w-full overflow-hidden">
            {images[0] ? (
              <img
                src={images[0]}
                alt={product.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                No image yet
              </div>
            )}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        </button>

        <div className="p-5">
          <button type="button" onClick={() => setOpen(true)} className="text-left">
            <h3 className="text-base font-extrabold text-white leading-snug">{product.name}</h3>
          </button>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-white">
              {displayPrice.label ? (
                <div className="text-sm font-semibold text-white/80">
                  {displayPrice.label}{" "}
                  <span className="text-lg font-extrabold text-white">R{formatZar(displayPrice.value)}</span>
                </div>
              ) : (
                <div className="text-lg font-extrabold text-white">R{formatZar(displayPrice.value)}</div>
              )}

              <div className="mt-1 text-[11px] text-white/45">
                {isBulkHerbal ? "Enquiry only" : isInStock ? `${stockCount} in stock` : "Out of stock"}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => (isBulkHerbal ? openWhatsAppEnquiry() : setOpen(true))}
              className="rounded-xl bg-[#C43A2F] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#a83228]"
            >
              {isBulkHerbal ? "Enquire" : "Add to cart"}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />

          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black text-white shadow-2xl">
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              {/* left: gallery */}
              <div className="border-b border-white/10 md:border-b-0 md:border-r">
                <div className="aspect-[4/3] w-full bg-white/5">
                  {images[activeImg] ? (
                    <img src={images[activeImg]} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
                      No image yet
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 p-3">
                    {images.map((src, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImg(idx)}
                        className={`h-16 w-16 overflow-hidden rounded-xl border ${
                          idx === activeImg ? "border-white/50" : "border-white/10"
                        }`}
                        title={`Image ${idx + 1}`}
                      >
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* right: info */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">{product.name}</h2>
                    <div className="mt-1 text-xs text-white/50">{product.category}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
                  >
                    Close
                  </button>
                </div>

                {product.description ? (
                  <p className="mt-4 text-sm text-white/75 whitespace-pre-wrap">{product.description}</p>
                ) : (
                  <p className="mt-4 text-sm text-white/45">No description yet.</p>
                )}

                {/* stock or enquiry note */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs font-semibold text-white/70">{isBulkHerbal ? "Ordering" : "Stock"}</div>
                  <div className="mt-1 text-sm font-bold">
                    {isBulkHerbal
                      ? "This item is enquiry-only. Tap Enquire to WhatsApp us."
                      : isInStock
                      ? `${stockCount} available`
                      : "Out of stock"}
                  </div>
                </div>

                {/* variants only matter for cartable items */}
                {!isBulkHerbal && variants.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs font-semibold text-white/70">Variants</div>

                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                    >
                      <option value="" className="bg-black">
                        Select a variant…
                      </option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id} className="bg-black">
                          {v.size}
                          {v.unit} • R{formatZar(v.price)}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 text-[11px] text-white/45">
                      Variants have different prices. Pick one before adding to cart.
                    </div>
                  </div>
                )}

                {/* qty + price + action */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  {!isBulkHerbal && (
                    <div className="w-full sm:w-40">
                      <div className="text-xs font-semibold text-white/70">Quantity</div>
                      <input
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))}
                        type="number"
                        min={1}
                        className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                      />
                      <div className="mt-1 text-[11px] text-white/45">Max: {stockCount}</div>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white/70">Price</div>
                    <div className="mt-2 text-2xl font-extrabold">
                      R{formatZar(!isBulkHerbal && selectedVariant ? selectedVariant.price : displayPrice.value)}
                    </div>
                    {!isBulkHerbal && variants.length > 0 && !selectedVariant && (
                      <div className="mt-1 text-[11px] text-white/45">Select a variant to confirm exact price.</div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!isBulkHerbal && !canAddToCart}
                    onClick={handleAdd}
                    className="rounded-2xl bg-[#C43A2F] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#a83228] disabled:opacity-40 disabled:hover:bg-[#C43A2F]"
                  >
                    {isBulkHerbal ? "Enquire" : "Add to cart"}
                  </button>
                </div>

                {!isBulkHerbal && !canAddToCart && (
                  <div className="mt-3 text-xs text-white/45">
                    {!isInStock
                      ? "This product is out of stock."
                      : variants.length > 0 && !selectedVariant
                      ? "Choose a variant first."
                      : "Quantity exceeds stock."}
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
