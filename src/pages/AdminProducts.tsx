import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const CATEGORIES = [
  "Mushroom Grow Kits",
  "Mushroom Grain & Cultures",
  "Mushroom Cultivation Supplies",
  "Medicinal Mushroom Supplements",
  "Bulk Herbal Products",
];

const MAX_IMAGES_PER_PRODUCT = 3;
const BUCKET = "PRODUCT-IMAGES";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  published?: boolean;
  updated_at?: string;
};

type VariantUnit = "kg" | "l";

type ProductVariant = {
  id: string;
  unit: VariantUnit;
  size: string;
  price: number;
};

function uid() {
  // @ts-ignore
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? // @ts-ignore
      crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normCategory(input: any) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ");
}

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadImages(productId: string, files: File[]) {
  const sliced = files.slice(0, MAX_IMAGES_PER_PRODUCT);
  const uploadedUrls: string[] = [];

  for (let i = 0; i < sliced.length; i++) {
    const file = sliced[i];
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";

    const path = `products/${productId}/${Date.now()}_${i}_${uid()}.${safeExt}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/*",
    });

    if (error) throw error;

    uploadedUrls.push(getPublicUrl(path));
  }

  return uploadedUrls;
}

function parseZar(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatZar(n: any): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
}

function normalizeVariants(v: any): ProductVariant[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => {
      const unit = x?.unit === "kg" ? "kg" : "l";
      const size = String(x?.size ?? "").trim();
      const price = Number(x?.price);
      if (!size || !Number.isFinite(price)) return null;
      return {
        id: String(x?.id ?? uid()),
        unit,
        size,
        price,
      } as ProductVariant;
    })
    .filter(Boolean) as ProductVariant[];
}

function minVariantPrice(variants: ProductVariant[]): number | null {
  if (!variants.length) return null;
  const prices = variants.map((v) => v.price).filter((p) => Number.isFinite(p));
  if (!prices.length) return null;
  return Math.min(...prices);
}

function toInStock(stockCount: number) {
  return Number(stockCount) > 0;
}

export default function AdminProducts() {
  // ── UI tokens (white cards) ────────────────────────────────────────────────
  const CARD = "rounded-2xl border border-black/10 bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,0.10)]";
  // const CARD_SOFT = "rounded-2xl border border-black/10 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]";
  const SUBPANEL = "rounded-2xl border border-black/10 bg-neutral-50 p-4";
  const INPUT =
    "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30";
  const SELECT =
    "w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-black/30";
  const TEXTAREA =
    "w-full min-h-[90px] rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30";
  const HELP = "text-xs text-black/60";
  const TITLE = "text-lg font-extrabold text-black";
  const BTN_SOFT =
    "rounded-xl border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black/80 transition hover:bg-neutral-50";
  const BTN_RED =
    "rounded-xl bg-[#C43A2F] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#a83228] disabled:opacity-60";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Add form
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [stockCount, setStockCount] = useState<string>("0");
  const [formError, setFormError] = useState<string>("");

  // Variants (Add form)
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [vUnit, setVUnit] = useState<VariantUnit>("l");
  const [vSize, setVSize] = useState("");
  const [vPrice, setVPrice] = useState("");

  // Images (Add form)
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const addImagesInputRef = useRef<HTMLInputElement | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("All");

  // Busy
  const [busy, setBusy] = useState(false);

  // FAQs
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [faqPublished, setFaqPublished] = useState(true);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqBusy, setFaqBusy] = useState(false);

  // Modal
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal drafts
  const [mName, setMName] = useState("");
  const [mCategory, setMCategory] = useState(CATEGORIES[0]);
  const [mPrice, setMPrice] = useState<string>("");
  const [mDescription, setMDescription] = useState("");
  const [mStock, setMStock] = useState<string>("0");
  const [mVariants, setMVariants] = useState<ProductVariant[]>([]);
  const [mImages, setMImages] = useState<string[]>([]);
  const [mError, setMError] = useState<string>("");

  const isInStock = (p: any) => Number(p?.stock_count ?? 0) > 0;

  const openProduct = useMemo(() => {
    if (!openProductId) return null;
    return (products as any[]).find((p) => p.id === openProductId) ?? null;
  }, [products, openProductId]);

  // ✅ Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("products")
      .select("id,name,category,price,description,in_stock,stock_count,images,variants,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("AdminProducts fetch error:", error);
      setProducts([]);
      setError(error.message || "Failed to load products");
      setLoading(false);
      return;
    }

    setProducts((data ?? []) as any[]);
    setLoading(false);
  };

  const fetchFaqs = async () => {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && Array.isArray(data)) setFaqs(data as any);
  };

  useEffect(() => {
    fetchProducts();
    fetchFaqs();
  }, []);

  // When modal opens, load drafts from selected product
  useEffect(() => {
    if (!openProduct) return;
    setMError("");
    setMName(String(openProduct.name ?? ""));
    setMCategory(String(openProduct.category ?? CATEGORIES[0]));
    setMPrice(openProduct.price != null ? String(openProduct.price) : "");
    setMDescription(String(openProduct.description ?? ""));
    setMStock(String(Number(openProduct.stock_count ?? 0)));
    setMVariants(normalizeVariants(openProduct.variants));
    setMImages(Array.isArray(openProduct.images) ? openProduct.images : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openProductId]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const wanted = normCategory(brandFilter);

    return (products as any[]).filter((p: any) => {
      if (brandFilter !== "All") {
        if (normCategory(p.category) !== wanted) return false;
      }

      if (query) {
        const hay = `${p.name ?? ""} ${p.category ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });
  }, [products, q, brandFilter]);

  const onPickAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    const remaining = Math.max(0, MAX_IMAGES_PER_PRODUCT - newFiles.length);
    if (remaining === 0) {
      e.target.value = "";
      return;
    }

    setNewFiles((prev) => [...prev, ...files.slice(0, remaining)]);
    e.target.value = "";
  };

  const removeNewFile = (idx: number) => setNewFiles((prev) => prev.filter((_, i) => i !== idx));

  const addVariant = () => {
    const size = vSize.trim();
    const parsed = parseZar(vPrice);
    if (!size || parsed === null) return;

    setVariants((prev) => [...prev, { id: uid(), unit: vUnit, size, price: parsed }]);
    setVSize("");
    setVPrice("");
  };

  const removeVariant = (id: string) => setVariants((prev) => prev.filter((v) => v.id !== id));

  // ✅ Supabase helpers
  const addProduct = async (payload: any) => {
    const { data, error } = await supabase.from("products").insert(payload).select("*");
    if (error) throw error;

    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error("Product insert failed (RLS/policy or unexpected response).");
    }

    return data[0];
  };

  const updateProduct = async (id: string, patch: any) => {
    const { data, error } = await supabase.from("products").update(patch).eq("id", id).select("*");

    if (error) throw error;

    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error("Update failed (no permission via RLS, or product not found).");
    }

    const row = data[0];
    setProducts((prev) => prev.map((p) => (p.id === id ? row : p)));
    return row;
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const onAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Product name is required.");
      return;
    }

    const normalizedVariants = normalizeVariants(variants);
    const baseFromVariants = minVariantPrice(normalizedVariants);
    const baseFromInput = parseZar(price);

    if (normalizedVariants.length === 0 && baseFromInput === null) {
      setFormError("Enter a base price OR add at least one variant.");
      return;
    }

    const finalBasePrice =
      normalizedVariants.length > 0 ? baseFromVariants ?? baseFromInput : baseFromInput;

    if (finalBasePrice === null) {
      setFormError("Price is invalid. Use numbers like 299 or 299.99");
      return;
    }

    const sc = Number(stockCount);
    if (!Number.isFinite(sc) || sc < 0) {
      setFormError("Stock count must be a number (0 or more).");
      return;
    }

    setBusy(true);
    try {
      const created = await addProduct({
        name: trimmedName,
        category,
        price: finalBasePrice,
        description: description.trim(),
        stock_count: Math.floor(sc),
        in_stock: toInStock(sc),
        images: [],
        variants: normalizedVariants,
      });

      // Upload images (optional)
      try {
        const urls = newFiles.length ? await uploadImages(created.id, newFiles) : [];
        if (urls.length) await updateProduct(created.id, { images: urls });
      } catch (err: any) {
        console.error("Image upload failed (product still created):", err);
        alert("Product saved, but image upload failed (Storage RLS/bucket).");
      }

      setName("");
      setPrice("");
      setCategory(CATEGORIES[0]);
      setDescription("");
      setStockCount("0");
      setNewFiles([]);
      setVariants([]);
      setVUnit("l");
      setVSize("");
      setVPrice("");
      if (addImagesInputRef.current) addImagesInputRef.current.value = "";

      await fetchProducts();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to add product");
    } finally {
      setBusy(false);
    }
  };

  // ✅ Modal image actions
  const triggerModalFilePicker = () => modalFileInputRef.current?.click();

  const onModalPickImages = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;

    setBusy(true);
    try {
      const urls = await uploadImages(productId, files.slice(0, MAX_IMAGES_PER_PRODUCT));
      const next = [...mImages, ...urls].slice(0, MAX_IMAGES_PER_PRODUCT);
      setMImages(next);
      await updateProduct(productId, { images: next });
    } catch (err: any) {
      console.error("Modal image upload failed:", err);
      alert(err?.message ?? "Failed to upload images");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const removeModalImage = async (productId: string, idx: number) => {
    const next = mImages.filter((_, i) => i !== idx);
    setBusy(true);
    try {
      setMImages(next);
      await updateProduct(productId, { images: next });
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to remove image");
    } finally {
      setBusy(false);
    }
  };

  // ✅ Modal variants actions
  const addModalVariant = () => {
    setMVariants((prev) => [...prev, { id: uid(), unit: "l", size: "", price: 0 }]);
  };

  const setModalVariant = (id: string, patch: Partial<ProductVariant>) => {
    setMVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const removeModalVariant = (id: string) => setMVariants((prev) => prev.filter((v) => v.id !== id));

  const saveModal = async () => {
    if (!openProductId) return;
    setMError("");

    const trimmed = mName.trim();
    if (!trimmed) {
      setMError("Product name is required.");
      return;
    }

    const stockNum = Number(mStock);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setMError("Stock count must be a number (0 or more).");
      return;
    }

    const cleanVariants = normalizeVariants(mVariants);
    const derived = minVariantPrice(cleanVariants);
    const baseFromInput = parseZar(mPrice);

    const finalPrice = cleanVariants.length > 0 ? derived ?? baseFromInput : baseFromInput;

    if (finalPrice === null) {
      setMError("Price is invalid. Use numbers like 299 or 299.99");
      return;
    }

    setBusy(true);
    try {
      await updateProduct(openProductId, {
        name: trimmed,
        category: mCategory,
        description: mDescription.trim(),
        stock_count: Math.floor(stockNum),
        in_stock: toInStock(stockNum),
        variants: cleanVariants,
        price: finalPrice,
        images: mImages,
      });
      setOpenProductId(null);
    } catch (err: any) {
      console.error(err);
      setMError(err?.message ?? "Failed to save product");
    } finally {
      setBusy(false);
    }
  };

  const deleteModalProduct = async () => {
    if (!openProductId) return;
    const ok = confirm("Delete this product permanently?");
    if (!ok) return;

    setBusy(true);
    try {
      await deleteProduct(openProductId);
      setOpenProductId(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to delete product");
    } finally {
      setBusy(false);
    }
  };

  // FAQ helpers
  const resetFaqForm = () => {
    setFaqQ("");
    setFaqA("");
    setFaqPublished(true);
    setEditingFaqId(null);
  };

  const upsertFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    const q2 = faqQ.trim();
    const a2 = faqA.trim();
    if (!q2 || !a2) return;

    setFaqBusy(true);
    try {
      if (editingFaqId) {
        const { error } = await supabase
          .from("faqs")
          .update({ question: q2, answer: a2, published: faqPublished })
          .eq("id", editingFaqId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("faqs")
          .insert({ question: q2, answer: a2, published: faqPublished });
        if (error) throw error;
      }

      resetFaqForm();
      await fetchFaqs();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to save FAQ");
    } finally {
      setFaqBusy(false);
    }
  };

  const editFaq = (id: string) => {
    const f = faqs.find((x) => x.id === id);
    if (!f) return;
    setEditingFaqId(id);
    setFaqQ(f.question);
    setFaqA(f.answer);
    setFaqPublished(f.published ?? true);
  };

  const toggleFaqPublished = async (id: string, next: boolean) => {
    setFaqBusy(true);
    try {
      const { error } = await supabase.from("faqs").update({ published: next }).eq("id", id);
      if (error) throw error;
      await fetchFaqs();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to update publish status");
    } finally {
      setFaqBusy(false);
    }
  };

  const deleteFaq = async (id: string) => {
    setFaqBusy(true);
    try {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
      setFaqs((prev) => prev.filter((x) => x.id !== id));
      if (editingFaqId === id) resetFaqForm();
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "Failed to delete FAQ");
    } finally {
      setFaqBusy(false);
    }
  };

  return (
    <div className="space-y-6 text-black">
      {/* Top row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={CARD}>
          <div className="text-sm font-semibold text-black/70">Products</div>
          <div className="mt-2 text-3xl font-extrabold text-black">{products.length}</div>
          <div className="mt-1 text-xs text-black/60">Loaded from Supabase. Like an actual store.</div>
          {loading && <div className="mt-2 text-xs text-black/60">Loading…</div>}
          {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
        </div>

        <div className={`${CARD} lg:col-span-2`}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className={`${INPUT} sm:col-span-2`}
            />
            <div className="rounded-xl border border-black/10 bg-neutral-50 px-3 py-2.5 text-sm text-black/60">
              Filter is in the Product list below
            </div>
          </div>
          <div className={`mt-2 ${HELP}`}>Search here. Category filter is attached to the Product list.</div>
        </div>
      </div>

      {/* Add product */}
      <div className={CARD}>
        <div className={TITLE}>Add product</div>
        <p className="mt-1 text-sm text-black/60">
          Uploads images to Supabase Storage and saves product data to Supabase DB. Prices support decimals.
        </p>

        {formError && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-900">
            {formError}
          </div>
        )}

        <form onSubmit={onAddProduct} className="mt-4 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className={INPUT}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={SELECT}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-white text-black">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Base price (optional if using variants)"
              className={`${INPUT} sm:col-span-2`}
            />
            <input
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              placeholder="Stock count"
              className={INPUT}
            />
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className={TEXTAREA}
          />

          {/* Images */}
          <div className={SUBPANEL}>
            <div className="text-sm font-semibold text-black/70">Images (max {MAX_IMAGES_PER_PRODUCT})</div>
            <input
              ref={addImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPickAddImages}
              className="mt-3 block w-full text-sm text-black/70"
            />
            {newFiles.length > 0 && (
              <div className="mt-3 grid gap-2">
                {newFiles.map((f, idx) => (
                  <div
                    key={`${f.name}_${idx}`}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-black/10"
                  >
                    <div className="truncate text-xs text-black/80">{f.name}</div>
                    <button type="button" onClick={() => removeNewFile(idx)} className={BTN_SOFT}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants */}
          <div className={SUBPANEL}>
            <div className="text-sm font-semibold text-black/70">Variants (optional)</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <select value={vUnit} onChange={(e) => setVUnit(e.target.value as VariantUnit)} className={SELECT}>
                <option value="l" className="bg-white text-black">l</option>
                <option value="kg" className="bg-white text-black">kg</option>
              </select>
              <input
                value={vSize}
                onChange={(e) => setVSize(e.target.value)}
                placeholder="Size (e.g. 5L, 1kg)"
                className={INPUT}
              />
              <input
                value={vPrice}
                onChange={(e) => setVPrice(e.target.value)}
                placeholder="Price"
                className={INPUT}
              />
              <button type="button" onClick={addVariant} className={BTN_SOFT}>
                Add variant
              </button>
            </div>

            {variants.length > 0 && (
              <div className="mt-3 grid gap-2">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-black/10"
                  >
                    <div className="text-xs text-black/80">
                      {v.size}
                      {v.unit} · R{formatZar(v.price)}
                    </div>
                    <button type="button" onClick={() => removeVariant(v.id)} className={BTN_SOFT}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button disabled={busy} className={BTN_RED}>
            {busy ? "Saving..." : "Save product"}
          </button>
        </form>
      </div>

      {/* Product list */}
      <div className={CARD}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={TITLE}>Product list</div>
            <div className="mt-1 text-xs text-black/60">Filter by category here. Click a product to edit it in the popup.</div>
          </div>

          <div className="text-sm text-black/60 sm:pt-1">
            Showing <span className="font-semibold text-black">{filtered.length}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-neutral-50 p-3">
          <div className="flex flex-wrap gap-2">
            {["All", ...CATEGORIES].map((c) => {
              const active = c === brandFilter;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBrandFilter(c)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    active ? "bg-[#C43A2F] text-white" : "border border-black/15 bg-white text-black/80 hover:bg-neutral-50"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {filtered.map((p: any) => {
            const inStock = isInStock(p);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenProductId(p.id)}
                className="w-full text-left rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold text-black">{p.name}</div>
                    <div className="mt-1 truncate text-xs text-black/60">{p.category}</div>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                      inStock ? "bg-emerald-500/15 text-emerald-900" : "bg-red-500/15 text-red-900"
                    }`}
                  >
                    {inStock ? "In stock" : "No stock"}
                  </span>
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-10 text-center text-black/60">
              No products found.
            </div>
          )}
        </div>
      </div>

      {/* ✅ EDIT MODAL */}
      {openProductId && openProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenProductId(null);
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl border border-black/10 bg-white p-5 shadow-2xl text-black">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-black">Edit product</div>
                <div className="mt-1 text-xs text-black/60">Changes save to Supabase. Click outside to close.</div>
              </div>

              <button type="button" onClick={() => setOpenProductId(null)} className={BTN_SOFT}>
                Close
              </button>
            </div>

            {mError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-900">
                {mError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Product name" className={INPUT} />
                <select value={mCategory} onChange={(e) => setMCategory(e.target.value)} className={SELECT}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-white text-black">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  value={mPrice}
                  onChange={(e) => setMPrice(e.target.value)}
                  placeholder="Base price (or leave if variants)"
                  className={`${INPUT} sm:col-span-2`}
                />
                <input value={mStock} onChange={(e) => setMStock(e.target.value)} placeholder="Stock count" className={INPUT} />
              </div>

              <textarea
                value={mDescription}
                onChange={(e) => setMDescription(e.target.value)}
                placeholder="Description"
                className="w-full min-h-[110px] rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
              />

              {/* Modal Images */}
              <div className={SUBPANEL}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-black/70">Images</div>
                  <div className="text-xs text-black/60">Max {MAX_IMAGES_PER_PRODUCT}</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {mImages.map((url, idx) => (
                    <div key={`${url}_${idx}`} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-black/10">
                      <div className="max-w-[220px] truncate text-xs text-black/80">{url}</div>
                      <button type="button" onClick={() => removeModalImage(openProductId, idx)} className={BTN_SOFT}>
                        Remove
                      </button>
                    </div>
                  ))}
                  {mImages.length === 0 && <div className="text-xs text-black/60">No images yet.</div>}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => onModalPickImages(openProductId, e)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={busy || mImages.length >= MAX_IMAGES_PER_PRODUCT}
                    onClick={triggerModalFilePicker}
                    className={`${BTN_SOFT} disabled:opacity-60`}
                  >
                    Upload images
                  </button>
                </div>
              </div>

              {/* Modal Variants */}
              <div className={SUBPANEL}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-black/70">Variants</div>
                  <button type="button" onClick={addModalVariant} className={BTN_SOFT}>
                    Add variant
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {mVariants.map((v) => (
                    <div key={v.id} className="grid grid-cols-1 gap-2 rounded-xl bg-white p-3 border border-black/10 sm:grid-cols-5">
                      <select
                        value={v.unit}
                        onChange={(e) => setModalVariant(v.id, { unit: e.target.value as VariantUnit })}
                        className={SELECT}
                      >
                        <option value="l" className="bg-white text-black">l</option>
                        <option value="kg" className="bg-white text-black">kg</option>
                      </select>

                      <input
                        value={v.size}
                        onChange={(e) => setModalVariant(v.id, { size: e.target.value })}
                        placeholder="Size (e.g. 5L, 1kg)"
                        className={`${INPUT} sm:col-span-2`}
                      />

                      <input
                        value={String(v.price ?? "")}
                        onChange={(e) => setModalVariant(v.id, { price: parseZar(e.target.value) ?? 0 })}
                        placeholder="Price"
                        className={INPUT}
                      />

                      <button type="button" onClick={() => removeModalVariant(v.id)} className={BTN_SOFT}>
                        Remove
                      </button>
                    </div>
                  ))}

                  {mVariants.length === 0 && <div className="text-xs text-black/60">No variants. Base price will be used.</div>}
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" disabled={busy} onClick={saveModal} className={BTN_RED}>
                  {busy ? "Saving..." : "Save changes"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={deleteModalProduct}
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-extrabold text-red-900 hover:bg-red-500/15 disabled:opacity-60"
                >
                  Delete product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQs */}
      <div className={CARD}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className={TITLE}>FAQs</div>
            <div className="mt-1 text-sm text-black/60">Manage your FAQ / Info page entries (and publish/unpublish them).</div>
          </div>
        </div>

        <form onSubmit={upsertFaq} className="mt-4 grid gap-3">
          <input value={faqQ} onChange={(e) => setFaqQ(e.target.value)} placeholder="Question" className={INPUT} />
          <textarea value={faqA} onChange={(e) => setFaqA(e.target.value)} placeholder="Answer" className={TEXTAREA} />

          <label className="flex items-center gap-2 text-sm text-black/70">
            <input
              type="checkbox"
              checked={faqPublished}
              onChange={(e) => setFaqPublished(e.target.checked)}
              className="h-4 w-4 accent-[#C43A2F]"
            />
            Published (visible on the website)
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button disabled={faqBusy} className={BTN_RED}>
              {editingFaqId ? "Update FAQ" : "Add FAQ"}
            </button>

            {editingFaqId && (
              <button type="button" onClick={resetFaqForm} className={BTN_SOFT}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 grid gap-2">
          {faqs.map((f) => {
            const isPublished = f.published ?? true;
            return (
              <div key={f.id} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-extrabold text-black">{f.question}</div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                      isPublished ? "bg-emerald-500/15 text-emerald-900" : "bg-black/5 text-black/70"
                    }`}
                  >
                    {isPublished ? "Published" : "Hidden"}
                  </span>
                </div>

                <div className="mt-2 text-sm text-black/70 whitespace-pre-wrap">{f.answer}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => editFaq(f.id)} className={BTN_SOFT}>
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={faqBusy}
                    onClick={() => toggleFaqPublished(f.id, !(f.published ?? true))}
                    className={`${BTN_SOFT} disabled:opacity-60`}
                  >
                    {(f.published ?? true) ? "Unpublish" : "Publish"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteFaq(f.id)}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-900 hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {faqs.length === 0 && (
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-10 text-center text-black/60">
              No FAQs yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}