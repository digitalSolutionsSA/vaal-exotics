import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      // blunt, reliable, and clears any “stuck” state
      navigate("/admin-login", { replace: true });
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1
              className="text-2xl font-extrabold"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Manage products without crying.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/products"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
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
