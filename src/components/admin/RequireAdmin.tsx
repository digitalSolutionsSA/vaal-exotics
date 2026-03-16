import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAILS = ["info@digitalsolutionssa.co.za"];

type Status = "loading" | "ok" | "no-session" | "not-admin" | "error";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [currentEmail, setCurrentEmail] = useState("");
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

        setCurrentEmail(email);
        console.log("[RequireAdmin] session user:", email || null);

        if (!user) {
          setStatus("no-session");
          return;
        }

        // Allow legacy / owner admin emails immediately
        if (ADMIN_EMAILS.includes(email)) {
          setStatus("ok");
          return;
        }

        // Allow client admins from the admin_users table
        const { data: adminUser, error: adminError } = await supabase
          .from("admin_users")
          .select("id, email, role, is_active")
          .eq("id", user.id)
          .eq("is_active", true)
          .single();

        if (adminError || !adminUser) {
          console.warn("[RequireAdmin] admin_users lookup failed or no active admin:", adminError);
          setStatus("not-admin");
          return;
        }

        console.log("[RequireAdmin] admin_users match:", adminUser.email);
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

  if (status === "ok") {
    return <>{children}</>;
  }

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
        <span className="text-white/90">{currentEmail || "unknown user"}</span>, but
        this account is not allowed as an admin.
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