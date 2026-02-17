import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If already logged in, go straight to admin.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/admin", { replace: true });
    });
  }, [nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (!data.session) throw new Error("No session returned. Auth failed.");

      nav("/admin", { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h1 className="text-xl font-extrabold">Admin Login</h1>
        <p className="mt-1 text-sm text-white/60">
          Real login. Real session. RLS stops throwing a tantrum.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
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
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
          />

          <button
            disabled={busy}
            className="rounded-xl bg-[#C43A2F] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[#a83228] disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
