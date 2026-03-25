import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { CartProvider } from "./context/cart";

import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import WhatsAppFloatingButton from "./components/WhatsappFloatingButton";
import CookieConsent from "./components/CookieConsent";

import Loader from "./components/Loader";

import homeBg from "./assets/new-bg.png";
import footerBg from "./assets/footer-bg.png";

import About from "./pages/About";
import Disclaimer from "./pages/Disclaimer";

import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Products from "./pages/Products";
import FAQ from "./pages/FAQ";

// Admin
import AdminLogin from "./pages/AdminLogin";
import AdminProducts from "./pages/AdminProducts";
import ClientAdminLogin from "./pages/ClientAdminLogin";

// Admin wrappers
import RequireAdmin from "./components/admin/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";

// Category pages
import GrowKits from "./pages/categories/GrowKits";
import Grain from "./pages/categories/Grain";
import Cultures from "./pages/categories/Cultures";
import SpecialOffers from "./pages/categories/SpecialOffers";
import CultivationSupplies from "./pages/categories/CultivationSupplies";
import MedicinalSupplements from "./pages/categories/MedicinalSupplements";
import BulkHerbal from "./pages/categories/BulkHerbal";

function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const [showLoader, setShowLoader] = useState(false);

  const criticalImages = useMemo(() => [homeBg, footerBg], []);

  const REAPPEAR_COOLDOWN_MS = 30_000;

  useEffect(() => {
    const sessionKey = "vaalexotics_session_loaded";
    const lastSeenKey = "vaalexotics_last_seen";

    const now = Date.now();

    const alreadyLoadedThisSession = sessionStorage.getItem(sessionKey);
    const lastSeenRaw = localStorage.getItem(lastSeenKey);
    const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;

    const beenAwayLongEnough = now - lastSeen > REAPPEAR_COOLDOWN_MS;

    if (!alreadyLoadedThisSession || beenAwayLongEnough) {
      setShowLoader(true);
    }

    localStorage.setItem(lastSeenKey, String(now));
  }, []);

  useEffect(() => {
    const lastSeenKey = "vaalexotics_last_seen";

    const markLastSeen = () => {
      localStorage.setItem(lastSeenKey, String(Date.now()));
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") markLastSeen();
    };

    window.addEventListener("pagehide", markLastSeen);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pagehide", markLastSeen);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const handleLoaderDone = () => {
    sessionStorage.setItem("vaalexotics_session_loaded", "true");
    localStorage.setItem("vaalexotics_last_seen", String(Date.now()));
    setShowLoader(false);
  };

  if (showLoader) {
    return <Loader images={criticalImages} onDone={handleLoaderDone} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative isolate">
      <div className="relative z-50">
        <Navbar />
      </div>

      <div className="flex-1 relative z-10">
        <div className={isHome ? "pt-0" : "pt-16 sm:pt-20"}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />

            <Route path="/faq" element={<FAQ />} />
            <Route path="/about" element={<About />} />
            <Route path="/disclaimer" element={<Disclaimer />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />

            {/* Checkout / YOCO success routes */}
            <Route path="/checkout/success" element={<OrderSuccess />} />
            <Route path="/checkout/cancel" element={<Navigate to="/checkout" replace />} />
            <Route path="/checkout/failed" element={<Navigate to="/checkout" replace />} />

            <Route path="/payment/success" element={<OrderSuccess />} />
            <Route path="/payment/cancel" element={<Navigate to="/checkout" replace />} />
            <Route path="/payment/failed" element={<Navigate to="/checkout" replace />} />

            {/* Backwards compatible success route */}
            <Route path="/order/success" element={<OrderSuccess />} />

            {/* Admin routes */}
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/client-admin-login" element={<ClientAdminLogin />} />

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

            {/* Category pages */}
            <Route path="/mushrooms/grow-kits" element={<GrowKits />} />
            <Route path="/mushrooms/grain" element={<Grain />} />
            <Route path="/mushrooms/cultures" element={<Cultures />} />
            <Route path="/mushrooms/special-offers" element={<SpecialOffers />} />
            <Route path="/mushrooms/cultivation-supplies" element={<CultivationSupplies />} />
            <Route
              path="/mushrooms/medicinal-supplements"
              element={<MedicinalSupplements />}
            />
            <Route path="/bulk-herbal" element={<BulkHerbal />} />

            {/* Direct routes */}
            <Route path="/special-offers" element={<SpecialOffers />} />

            {/* Direct /shop routes for navbar + older links */}
            <Route path="/shop/growkits" element={<GrowKits />} />
            <Route path="/shop/grain" element={<Grain />} />
            <Route path="/shop/cultures" element={<Cultures />} />
            <Route path="/shop/special-offers" element={<SpecialOffers />} />
            <Route path="/shop/cultivation-supplies" element={<CultivationSupplies />} />
            <Route
              path="/shop/medicinal-supplements"
              element={<MedicinalSupplements />}
            />
            <Route path="/shop/bulk-herbal" element={<BulkHerbal />} />

            {/* Legacy redirects */}
            <Route
              path="/mushrooms/grain-and-cultures"
              element={<Navigate to="/mushrooms/grain" replace />}
            />
            <Route
              path="/shop/grain-and-cultures"
              element={<Navigate to="/shop/grain" replace />}
            />
            <Route
              path="/medicinal"
              element={<Navigate to="/mushrooms/medicinal-supplements" replace />}
            />
            <Route path="/herbal" element={<Navigate to="/bulk-herbal" replace />} />

            {/* Optional redirects for old / alternate specials links */}
            <Route
              path="/offers"
              element={<Navigate to="/special-offers" replace />}
            />
            <Route
              path="/specials"
              element={<Navigate to="/special-offers" replace />}
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      {!isHome && (
        <div className="relative z-40">
          <Footer />
        </div>
      )}

      <CookieConsent />

      <div className="fixed z-[9999]">
        <WhatsAppFloatingButton
          phoneNumber="27782166865"
          message="Hi Vaal Exotics 👋 I'm interested in your products. Can you assist me?"
        />
      </div>
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