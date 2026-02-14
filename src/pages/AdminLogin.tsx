import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { setAdminAuthed } from "../lib/adminAuth";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation() as any;

  // Store this in .env later
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "vaaladmin";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== ADMIN_PASSWORD) {
      setError("Wrong password. Try again.");
      return;
    }

    setAdminAuthed(true);

    const redirectTo = location?.state?.from || "/admin/products";
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-white">
      <h1
        className="text-3xl font-extrabold"
        style={{ fontFamily: "Montserrat, sans-serif" }}
      >
        Admin Login
      </h1>
      <p className="mt-2 text-white/60 text-sm">
        Enter your admin password to continue.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
      >
        <label className="text-xs font-semibold text-white/70">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-white/20"
          placeholder="••••••••"
        />

        {error && (
          <div className="mt-3 text-sm text-red-400 font-semibold">{error}</div>
        )}

        <button
          type="submit"
          className="mt-5 w-full rounded-xl bg-[#C43A2F] py-3 text-sm font-extrabold text-white hover:bg-[#a83228] transition"
        >
          Sign In
        </button>

        <div className="mt-3 text-xs text-white/40">
          Tip: set <span className="text-white/70">VITE_ADMIN_PASSWORD</span> in your .env
        </div>
      </form>
    </div>
  );
}
