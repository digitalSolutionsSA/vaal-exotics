import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import herbalBg from "../../assets/new-bg.png";
import { CATEGORY, normCategory } from "../../lib/category";

const CAT = CATEGORY.bulk;

// Brand accents
const BRAND_RED = "#C43A2F";
const BRAND_BLUE = "#2F4D7A";

const OWNER_WHATSAPP =
  (import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP || "";

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
        .select(
          "id,name,category,price,description,image_url,images,variants,created_at"
        )
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
        return prev.map((x) =>
          x.key === key ? { ...x, qty: x.qty + 1 } : x
        );
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

      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-6 pt-16 pb-20">
        <h1 className="text-4xl font-extrabold text-white">
          Bulk Herbal Products
        </h1>

        {loading && (
          <div className="mt-8 text-white">Loading products...</div>
        )}

        <div className="mt-7 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filteredProducts.map((p) => {
            const img = getBestImage(p);
            const variants = normalizeVariants(p);
            const selectedId = selectedVariantByProduct[p.id];
            const selectedVariant =
              variants.length && selectedId
                ? variants.find((v) => v.id === selectedId) ?? variants[0]
                : null;

            const displayPrice =
              selectedVariant?.price ?? Number(p.price ?? 0);

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
                    />
                  )}
                </div>

                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="text-sm font-extrabold line-clamp-2">
                    {p.name}
                  </h3>

                  {shortDesc(p.description) && (
                    <p className="mt-1 text-xs text-black/60 line-clamp-2">
                      {shortDesc(p.description)}
                    </p>
                  )}

                  <div className="mt-2 text-lg font-extrabold text-red-700">
                    {formatZar(displayPrice)}
                  </div>

                  {/* Pinned bottom section */}
                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => addToEnquiry(p)}
                      className="w-full py-2 text-xs font-extrabold text-white"
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
      </div>
    </main>
  );
}