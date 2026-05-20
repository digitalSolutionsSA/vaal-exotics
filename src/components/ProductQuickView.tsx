import { useEffect, useMemo, useState } from "react";

export type VariantUnit = "kg" | "l" | "ml";

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
  images?: any;
  variants?: any;
  created_at?: string;
};

const BULK_CATEGORY = "Bulk Herbal Products";
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
  return Number.isFinite(n) ? `R${n.toFixed(2)}` : "R0.00";
}
function normalizeVariants(v: any): ProductVariant[] {
  if (!Array.isArray(v)) return [];
  return (v
    .map((x) => {
      const id = String(x?.id ?? "");
      const unit = x?.unit === "l" ? "l" : x?.unit === "kg" ? "kg" : x?.unit === "ml" ? "ml" : null;
      const size = String(x?.size ?? "").trim();
      const price = Number(x?.price);
      if (!id || !unit || !size || !Number.isFinite(price)) return null;
      return { id, unit, size, price } as ProductVariant;
    })
    .filter(Boolean) as ProductVariant[])
    .sort((a, b) => a.price - b.price);
}
function coerceImages(raw: any): string[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) arr = p; } catch { /**/ }
  }
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}
function getImages(p: ShopProduct): string[] {
  const arr = coerceImages(p.images);
  if (arr.length) return arr;
  const f = String(p.image_url ?? "").trim();
  return f ? [f] : [];
}
function minVariantPrice(list: ProductVariant[]) {
  if (!list.length) return null;
  return Math.min(...list.map((v) => v.price));
}

type Props = {
  product: ShopProduct;
  onAddToCart?: (args: { product: ShopProduct; qty: number; variant?: ProductVariant | null }) => void;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  hideCard?: boolean;
  accent?: "red" | "blue";
};

export default function ProductQuickView({
  product, onAddToCart, open, onOpenChange, hideCard = false, accent = "blue",
}: Props) {
  const images  = useMemo(() => getImages(product), [product]);
  const variants = useMemo(() => normalizeVariants(product.variants), [product]);

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => { onOpenChange?.(next); if (open === undefined) setInternalOpen(next); };

  const [activeImg, setActiveImg]           = useState(0);
  const [qty, setQty]                       = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  const isBulkHerbal = String(product.category ?? "").trim() === BULK_CATEGORY;
  const stockCount   = useMemo(() => { const n = Number(product.stock_count ?? 0); return Number.isFinite(n) ? n : 0; }, [product.stock_count]);
  const isInStock    = useMemo(() => product.in_stock === true && stockCount > 0, [product.in_stock, stockCount]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveImg(0); setQty(1);
    if (variants.length > 0) {
      setSelectedVariantId((prev) => variants.some((v) => v.id === prev) ? prev : variants[0].id);
    } else setSelectedVariantId("");
  }, [isOpen, variants, product.id]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen]);

  const selectedVariant = useMemo(() =>
    variants.length ? (variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null) : null,
  [variants, selectedVariantId]);

  const displayPrice = useMemo(() => { const m = minVariantPrice(variants); return m !== null ? m : Number(product.price ?? 0); }, [variants, product.price]);
  const exactPrice   = useMemo(() => variants.length > 0 ? (selectedVariant?.price ?? displayPrice) : displayPrice, [variants.length, selectedVariant, displayPrice]);

  const canAddToCart = useMemo(() => {
    if (isBulkHerbal || !isInStock) return false;
    if (variants.length > 0 && !selectedVariant) return false;
    return qty > 0 && qty <= Math.max(stockCount, 1);
  }, [isBulkHerbal, isInStock, variants.length, selectedVariant, qty, stockCount]);

  const accentColor = accent === "red" ? BRAND_RED : BRAND_BLUE;

  const openWhatsApp = () => {
    const digits = toWaDigits(OWNER_WHATSAPP);
    if (!digits) { alert("Missing WhatsApp number."); return; }
    const vt = selectedVariant ? ` (${selectedVariant.size}${selectedVariant.unit.toUpperCase()})` : "";
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(`Hi Vaal Exotics, I'd like to enquire about ${product.name}${vt}.`)}`, "_blank", "noopener,noreferrer");
  };

  const handleAdd = () => {
    if (isBulkHerbal) { openWhatsApp(); setOpen(false); return; }
    if (!canAddToCart) return;
    onAddToCart?.({ product, qty, variant: selectedVariant });
    setOpen(false);
  };

  const setQtySafe = (next: number) => {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    setQty(Math.min(Math.max(1, Math.floor(n)), Math.max(1, stockCount || 1)));
  };

  return (
    <>
      {/* ── Product Card ── */}
      {!hideCard && (
        <div className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-shadow hover:shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
          <button type="button" onClick={() => setOpen(true)} className="relative block w-full text-left" title="View product">
            <div className="aspect-[4/3] w-full overflow-hidden bg-black/5">
              {images[0] ? (
                <img src={images[0]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-black/40">No image yet</div>
              )}
            </div>
          </button>
          <div className="p-4">
            <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-black">{product.name}</h3>
            <div className="mt-2 text-lg font-extrabold" style={{ color: accentColor }}>{formatZar(displayPrice)}</div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/55 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          {/* Floating card — compact on mobile, two-col on desktop */}
          <div
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:max-w-4xl md:flex-row"
            style={{ maxHeight: "82dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Prominent Close Button ──
                Sits outside the scroll area, always reachable.
                Large hit target, high-contrast red to match brand. */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95"
              style={{ backgroundColor: BRAND_RED }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* ── Left: compact image ──
                Fixed small height on mobile — enough to show the product,
                not so tall it pushes details off screen. */}
            <div className="shrink-0 bg-[#F6F5F2] md:w-[45%] md:shrink-0">
              {/* Mobile: short fixed height. Desktop: fills column. */}
              <div className="h-44 w-full overflow-hidden md:h-full">
                {images[activeImg] ? (
                  <img
                    src={images[activeImg]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-black/30">
                    No image
                  </div>
                )}
              </div>

              {/* Thumbnails — only shown on desktop to keep mobile compact */}
              {images.length > 1 && (
                <div className="hidden gap-2 overflow-x-auto border-t border-black/[0.06] bg-white/50 px-3 py-2 md:flex">
                  {images.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setActiveImg(idx)}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl transition-all ${
                        idx === activeImg ? "ring-2 ring-black/70 ring-offset-1 opacity-100" : "opacity-50 hover:opacity-75"
                      }`}
                      title={`Image ${idx + 1}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Right: scrollable details ── */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">

              {/* Name + price — tight spacing */}
              <div className="pr-8">
                <h2 className="text-[15px] font-extrabold leading-snug text-black md:text-xl">
                  {product.name}
                </h2>
                <div className="mt-1 text-xl font-black tracking-tight" style={{ color: BRAND_RED }}>
                  {formatZar(exactPrice)}
                </div>
              </div>

              <div className="my-3 h-px bg-black/[0.07]" />

              {/* Description — scrolls with the panel */}
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-black/55 md:text-sm">
                {product.description || "No description yet."}
              </p>

              {/* Variant selector */}
              {variants.length > 0 && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-black/35">Size</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-black outline-none"
                  >
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.size}{v.unit.toUpperCase()} · {formatZar(v.price)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity stepper */}
              {!isBulkHerbal && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-black/35">Quantity</label>
                  <div className="inline-flex items-center overflow-hidden rounded-xl border border-black/10 bg-white">
                    <button type="button" onClick={() => setQtySafe(qty - 1)} className="flex h-9 w-9 items-center justify-center text-base text-black/40 transition hover:bg-black/5 hover:text-black">−</button>
                    <div className="w-8 select-none text-center text-sm font-bold text-black">{qty}</div>
                    <button type="button" onClick={() => setQtySafe(qty + 1)} className="flex h-9 w-9 items-center justify-center text-base text-black/40 transition hover:bg-black/5 hover:text-black">+</button>
                  </div>
                </div>
              )}

              {/* Status */}
              {!isBulkHerbal && !isInStock && (
                <p className="mt-3 text-xs font-semibold" style={{ color: BRAND_RED }}>Out of stock</p>
              )}
              {!isBulkHerbal && !canAddToCart && isInStock && (
                <p className="mt-1.5 text-xs text-black/35">
                  {variants.length > 0 && !selectedVariant ? "Choose a size to continue." : "Quantity exceeds stock."}
                </p>
              )}

              <div className="flex-1" />

              {/* CTA buttons */}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!isBulkHerbal && !canAddToCart}
                  onClick={handleAdd}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-[13px] font-extrabold text-white transition active:scale-[0.98] disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: (!isBulkHerbal && !canAddToCart) ? "rgba(0,0,0,0.07)" : BRAND_RED,
                    color: (!isBulkHerbal && !canAddToCart) ? "rgba(0,0,0,0.3)" : "white",
                  }}
                >
                  {isBulkHerbal ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 00.906.94l5.91-1.553A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                      </svg>
                      Enquire via WhatsApp
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/>
                      </svg>
                      Add to cart
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-black/10 py-2.5 text-[12.5px] font-semibold text-black/50 transition hover:text-black/75 active:scale-[0.98]"
                >
                  Continue browsing
                </button>
              </div>

              <div className="h-1" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}