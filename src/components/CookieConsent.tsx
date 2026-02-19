import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "vaal_cookie_consent_v2";

const BRAND_RED = "#C43A2F";
const BRAND_BLUE = "#2F4D7A";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(KEY);
      if (!existing) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const save = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[10000]">
      <div className="w-[320px] rounded-xl border border-black/10 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.25)] p-5">
        {/* Gradient Heading */}
        <h3
          className="text-sm font-extrabold tracking-tight mb-2"
          style={{
            background: `linear-gradient(90deg, ${BRAND_BLUE}, ${BRAND_RED})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Cookie Policy
        </h3>

        <p className="text-xs text-black/70 leading-relaxed">
          We use essential cookies to ensure proper functionality and improve
          your experience. By continuing to use this website, you agree to our
          cookie policy.
        </p>

        <div className="mt-3 text-xs">
          <Link
            to="/disclaimer#cookie-policy"

            className="text-black/60 hover:text-black underline"
          >
            Read full policy
          </Link>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => save("declined")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-black/15 text-black/70 hover:bg-black/5"
          >
            Decline
          </button>

          <button
            onClick={() => save("accepted")}
            className="px-3 py-1.5 text-xs font-semibold rounded-md text-white"
            style={{ backgroundColor: BRAND_BLUE }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
