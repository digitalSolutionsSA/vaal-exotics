import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import webBg from "../assets/web-bg.png";

type LocationState = {
  from?: string;
};

export default function AdminLogin() {
  const nav = useNavigate();
  const location = useLocation();

  // If guard redirected here, it should pass state.from.
  // Otherwise default to admin landing.
  const from = useMemo(() => {
    const state = (location.state as LocationState | null) ?? null;
    const candidate = state?.from;
    // Only allow internal paths (basic safety + avoids weird redirects)
    if (candidate && typeof candidate === "string" && candidate.startsWith("/")) {
      return candidate;
    }
    return "/admin/products";
  }, [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If already logged in, go straight to admin destination.
    let alive = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;

      if (error) {
        console.error("[AdminLogin] getSession error:", error);
        return;
      }

      if (data.session) {
        nav(from, { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav, from]);

  // Optional debug: keep this while testing, remove later if you want.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Auth]", event, session?.user?.email ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      // Double-check session after sign-in (more reliable)
      const { data: s2, error: e2 } = await supabase.auth.getSession();
      if (e2) throw e2;

      const session = s2.session ?? data.session;
      if (!session) {
        throw new Error(
          "Signed in but no session found. Check Supabase URL/key and auth storage."
        );
      }

      console.log("[AdminLogin] signed in as:", session.user.email);
      console.log("[AdminLogin] access token exists:", !!session.access_token);

      // Go to intended destination or admin landing.
      nav(from, { replace: true });
    } catch (err: any) {
      console.error("[AdminLogin] sign-in error:", err);
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen text-black flex items-center justify-center p-4">
      {/* ✅ Same background as Hero (no overlay) */}
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
      <div className="relative z-10 w-full max-w-md">
        {/* ✅ Solid white card, black text */}
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
          <h1 className="text-xl font-extrabold text-black">Admin Login</h1>
          <p className="mt-1 text-sm text-black/60">
            Real login. Real session. RLS stops throwing a tantrum.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-4 grid gap-3">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              type="email"
              autoComplete="email"
              className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black placeholder:text-black/40 outline-none focus:border-black/30"
            />

            <button
              disabled={busy}
              className="rounded-xl bg-[#C43A2F] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#a83228] disabled:opacity-60"
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}