import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAILS = ["info@digitalsolutionssa.co.za"];

type Status = "loading" | "ok" | "no-session" | "not-admin" | "error";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;

        if (error) {
          console.error("[RequireAdmin] getSession error:", error);
          setStatus("no-session");
          return;
        }

        const user = data.session?.user ?? null;
        const email = user?.email?.toLowerCase().trim() ?? "";

        console.log("[RequireAdmin] session user:", email || null);

        if (!user) {
          setStatus("no-session");
          return;
        }

        if (!ADMIN_EMAILS.includes(email)) {
          setStatus("not-admin");
          return;
        }

        setStatus("ok");
      } catch (e) {
        console.error("[RequireAdmin] unexpected error:", e);
        if (!alive) return;
        setStatus("error");
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/70">
        Checking admin access...
      </div>
    );
  }

  if (status === "ok") return <>{children}</>;

  if (status === "no-session") {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/70">
        Admin check failed. Check console logs.
      </div>
    );
  }

  // not-admin
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/80 px-4 text-center">
      <h1 className="text-xl font-bold text-white">Access denied</h1>
      <p className="mt-2 max-w-md text-white/70">
        You are signed in as{" "}
        <span className="text-white/90">info@digitalsolutionssa.co.za</span>, but
        this account is not allowed as an admin in the app guard.
      </p>
      <button
        className="mt-5 rounded-lg bg-white/10 px-4 py-2 hover:bg-white/15"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
