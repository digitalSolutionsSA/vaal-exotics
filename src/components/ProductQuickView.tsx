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
      //
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
  onAddToCart?: (args: {
    product: ShopProduct;
    qty: number;
    variant?: ProductVariant | null;
  }) => void;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  hideCard?: boolean;
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

  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
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
    const flag = product.in_stock === true;
    return flag && stockCount > 0;
  }, [product.in_stock, stockCount]);

  useEffect(() => {
    if (!isOpen) return;

    setActiveImg(0);
    setQty(1);

    if (variants.length > 0) {
      setSelectedVariantId((prev) => {
        const stillExists = variants.some((v) => v.id === prev);
        return stillExists ? prev : variants[0].id;
      });
    } else {
      setSelectedVariantId("");
    }
  }, [isOpen, variants, product.id]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) => v.id === selectedVariantId) ?? variants[0] ?? null;
  }, [variants, selectedVariantId]);

  const displayPrice = useMemo(() => {
    const min = minVariantPrice(variants);
    if (min !== null) return min;
    return Number(product.price ?? 0);
  }, [variants, product.price]);

  const exactPrice = useMemo(() => {
    if (variants.length > 0) return selectedVariant?.price ?? displayPrice;
    return displayPrice;
  }, [variants.length, selectedVariant, displayPrice]);

  const canAddToCart = useMemo(() => {
    if (isBulkHerbal) return false;
    if (!isInStock) return false;
    if (variants.length > 0 && !selectedVariant) return false;
    if (qty <= 0) return false;
    if (qty > Math.max(stockCount, 1)) return false;
    return true;
  }, [isBulkHerbal, isInStock, variants.length, selectedVariant, qty, stockCount]);

  const accentColor = accent === "red" ? BRAND_RED : BRAND_BLUE;

  const openWhatsAppEnquiry = () => {
    const digits = toWaDigits(OWNER_WHATSAPP);
    if (!digits) {
      alert("Missing WhatsApp number. Set VITE_VAAL_EXOTICS_WHATSAPP in your .env file.");
      return;
    }

    const variantText = selectedVariant
      ? ` (${selectedVariant.size}${selectedVariant.unit.toUpperCase()})`
      : "";

    const msg = `Hi Vaal Exotics, I'd like to enquire about ${product.name}${variantText}.`;
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

    onAddToCart?.({
      product,
      qty,
      variant: selectedVariant,
    });

    setOpen(false);
  };

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
      {!hideCard && (
        <div className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-shadow hover:shadow-[0_16px_45px_rgba(0,0,0,0.14)]">
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
            <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-black">
              {product.name}
            </h3>
            <div className="mt-2 text-lg font-extrabold" style={{ color: accentColor }}>
              {formatZar(displayPrice)}
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/95 text-black shadow"
                aria-label="Close quick view"
              >
                ×
              </button>

              <div className="grid max-h-[92vh] grid-cols-1 md:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b border-black/10 bg-[#f7f7f7] md:border-b-0 md:border-r">
                  <div className="aspect-square w-full bg-white">
                    {images[activeImg] ? (
                      <img
                        src={images[activeImg]}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-black/40">
                        No image available
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-black/10 bg-white p-3">
                      {images.map((src, idx) => (
                        <button
                          key={`${src}-${idx}`}
                          type="button"
                          onClick={() => setActiveImg(idx)}
                          className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border ${
                            idx === activeImg ? "border-black" : "border-black/10"
                          }`}
                          title={`Image ${idx + 1}`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="max-h-[92vh] overflow-y-auto p-4 sm:p-5 md:p-6">
                  <div className="pr-10">
                    <h2 className="text-xl font-extrabold leading-tight text-black sm:text-2xl">
                      {product.name}
                    </h2>

                    <div className="mt-3 text-2xl font-extrabold sm:text-3xl" style={{ color: BRAND_RED }}>
                      {formatZar(exactPrice)}
                    </div>

                    <div className="mt-4 rounded-xl border border-black/10 bg-black/[0.03] p-3">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-black/75 sm:text-[15px]">
                        {product.description || "No description yet."}
                      </p>
                    </div>

                    {variants.length > 0 && (
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-black/55">
                          Size
                        </label>
                        <select
                          value={selectedVariantId}
                          onChange={(e) => setSelectedVariantId(e.target.value)}
                          className="w-full rounded-xl border border-black/15 bg-white px-3 py-3 text-sm outline-none"
                        >
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.size}
                              {v.unit.toUpperCase()} · {formatZar(v.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isBulkHerbal && (
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-black/55">
                          Quantity
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setQtySafe(qty - 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white text-lg font-semibold text-black"
                          >
                            −
                          </button>

                          <div className="min-w-[24px] text-center text-sm font-semibold text-black">
                            {qty}
                          </div>

                          <button
                            type="button"
                            onClick={() => setQtySafe(qty + 1)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 bg-white text-lg font-semibold text-black"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        disabled={!isBulkHerbal && !canAddToCart}
                        onClick={handleAdd}
                        className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-extrabold ${
                          isBulkHerbal
                            ? "text-white"
                            : canAddToCart
                            ? "text-white"
                            : "cursor-not-allowed bg-black/10 text-black/40"
                        }`}
                        style={
                          isBulkHerbal || canAddToCart
                            ? { backgroundColor: accentColor }
                            : undefined
                        }
                      >
                        {isBulkHerbal ? "Add to enquiry" : "Add to cart"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-black"
                      >
                        Continue browsing
                      </button>
                    </div>

                    {isBulkHerbal ? (
                      <p className="mt-3 text-xs text-black/50">
                        Add items to your enquiry and continue browsing.
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-black/50">
                        Add items to your cart and continue shopping.
                      </p>
                    )}

                    {!isBulkHerbal && !isInStock && (
                      <div className="mt-3 text-xs font-semibold" style={{ color: BRAND_RED }}>
                        This product is out of stock.
                      </div>
                    )}

                    {!isBulkHerbal && !canAddToCart && isInStock && (
                      <div className="mt-2 text-xs text-black/50">
                        {variants.length > 0 && !selectedVariant
                          ? "Choose a variant first."
                          : "Quantity exceeds stock."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}