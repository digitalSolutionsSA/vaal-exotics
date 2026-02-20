import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import webBg from "../../assets/web-bg.png";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("[AdminLayout] signOut error:", error);
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-7rem)] text-white overflow-hidden">
      {/* Hero Background ONLY */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${webBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-2xl font-extrabold"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Manage products without crying.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/products"
              className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm font-semibold text-white hover:bg-black/40 transition"
            >
              Products
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg bg-[#C43A2F] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#a83228] transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}