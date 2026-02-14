import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { CartProvider } from "./context/cart";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import WhatsAppFloatingButton from "./components/WhatsappFloatingButton";
import About from "./pages/About";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Products from "./pages/Products";
import FAQ from "./pages/FAQ";

// Admin
import AdminLogin from "./pages/AdminLogin";
import AdminProducts from "./pages/AdminProducts";

// Admin wrappers
import RequireAdmin from "./components/admin/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";

// Category pages
import GrowKits from "./pages/categories/GrowKits";
import GrainCultures from "./pages/categories/GrainCultures";
import CultivationSupplies from "./pages/categories/CultivationSupplies";
import MedicinalSupplements from "./pages/categories/MedicinalSupplements";
import BulkHerbal from "./pages/categories/BulkHerbal";

function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    // ✅ flex layout keeps footer stable and prevents weird page height behavior
    <div className="min-h-screen flex flex-col text-black">
      <Navbar />

      {/* ✅ Main content grows; footer stays */}
      <div className="flex-1">
        {/* ✅ Navbar offset: consistent + responsive */}
        <div className={isHome ? "pt-0" : "pt-16 sm:pt-20"}>
          <Routes>
            {/* Core */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />

            {/* Cart / Checkout */}
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/success" element={<OrderSuccess />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route
              path="/admin/products"
              element={
                <RequireAdmin>
                  <AdminLayout>
                    <AdminProducts />
                  </AdminLayout>
                </RequireAdmin>
              }
            />

            {/* Categories */}
            <Route path="/mushrooms/grow-kits" element={<GrowKits />} />
            <Route path="/mushrooms/grain-and-cultures" element={<GrainCultures />} />
            <Route path="/mushrooms/cultivation-supplies" element={<CultivationSupplies />} />
            <Route path="/mushrooms/medicinal-supplements" element={<MedicinalSupplements />} />
            <Route path="/bulk-herbal" element={<BulkHerbal />} />

            {/* Backward compatibility */}
            <Route
              path="/medicinal"
              element={<Navigate to="/mushrooms/medicinal-supplements" replace />}
            />
            <Route path="/herbal" element={<Navigate to="/bulk-herbal" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {/* ✅ Footer stays. No disappearing acts. */}
      <Footer />

      {/* Floating WhatsApp Button (global) */}
      <WhatsAppFloatingButton
        phoneNumber="27639034514"
        message="Hi Vaal Exotics 👋 I'm interested in your products. Can you assist me?"
      />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </CartProvider>
  );
}
