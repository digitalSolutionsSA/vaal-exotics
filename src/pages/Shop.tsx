import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  in_stock: boolean;
  stock_count: number;
  image_url?: string | null;
  images?: any; // jsonb
  created_at?: string;
};

function formatZar(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function primaryImage(p: ProductRow): string | null {
  const imgs = Array.isArray(p.images) ? p.images : [];
  return (imgs[0] as string) || p.image_url || null;
}

export default function Shop() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // tiny search for convenience
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("products")
        .select("id,name,category,price,in_stock,stock_count,image_url,images,created_at")
         // <-- archived products hidden
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Shop fetch error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setProducts((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => {
      const hay = `${p.name ?? ""} ${p.category ?? ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [products, q]);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold">Shop</h1>
            <p className="mt-3 text-black/70">All products live here. (Now with images that actually show up.)</p>
          </div>

          <div className="w-full sm:w-80">
            <div className="text-xs font-semibold text-black/60">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products..."
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-black/20"
            />
          </div>
        </div>

        {loading && <div className="mt-8 text-sm text-black/60">Loading…</div>}
        {error && <div className="mt-8 text-sm text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const img = primaryImage(p);

              return (
                <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl border border-black/10 bg-black/5">
                    {img ? (
                      <img src={img} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                        No image yet
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="mt-1 text-xs text-black/60">{p.category}</div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-base font-extrabold">R{formatZar(p.price)}</div>
                      <div className="text-xs text-black/50">Stock: {Number(p.stock_count ?? 0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl border border-black/10 bg-black/5 p-6 text-sm text-black/60">
                No products found.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
