import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import medicinalBg from "../../assets/medicinal-bg.png";
import ProductQuickView from "../../components/ProductQuickView";
import { CATEGORY, normCategory } from "../../lib/category";

const CAT = CATEGORY.medicinal;

type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  in_stock?: boolean | null;
  stock_count?: number | null;
  image_url?: string | null;
  images?: string[] | null;
  variants?: any[] | null;
  created_at?: string;
};

export default function MedicinalSupplements() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);

      // ✅ DO NOT filter by stock.
      // We want products to show even if stock_count = 0 ("No stock" label).
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,category,price,description,in_stock,stock_count,image_url,images,variants,created_at"
        )
        .eq("category", CAT)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("MedicinalSupplements fetch error:", error);
        setProducts([]);
        setLoading(false);
        return;
      }

      setProducts((data ?? []) as ShopProduct[]);
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // ✅ Safety net for older rows where category strings were inconsistent
  const filteredProducts = useMemo(() => {
    const want = normCategory(CAT);
    return products.filter((p) => normCategory(p?.category) === want);
  }, [products]);

  const addToCart = ({ product, qty, variant }: any) => {
    console.log("ADD TO CART:", { productId: product.id, qty, variant });
  };

  return (
    <main className="relative min-h-screen text-black">
      {/* ✅ Fixed background so it stays put + shows behind navbar */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${medicinalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ✅ Fixed layered white overlays like FeaturedCategories */}
      <div className="fixed inset-0 z-0 bg-white/35 pointer-events-none" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.75)_55%,rgba(255,255,255,0.90)_100%)]" />

      {/* ✅ Content above background/overlays */}
      <div className="relative z-10 mx-auto max-w-[1600px] px-6 sm:px-10 xl:px-16 pt-16 pb-24">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50">
          Mushrooms
        </p>

        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
          Medicinal Supplements
        </h1>

        <p className="mt-4 max-w-2xl text-black/70">
          Functional mushroom products for daily routines. Clean ingredients,
          easy habits, real-world use.
        </p>

        {loading && <div className="mt-12 text-black/60">Loading products...</div>}

        {!loading && filteredProducts.length === 0 && (
          <div className="mt-12 text-black/60">No products in this category yet.</div>
        )}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((p) => (
            <ProductQuickView key={p.id} product={p} onAddToCart={addToCart} />
          ))}
        </div>
      </div>
    </main>
  );
}
