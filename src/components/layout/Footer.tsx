import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import footerCover from "../../assets/footer-cover.png";
import footerBg from "../../assets/footer-bg.png";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Logo gradient (blue -> red)
const GRADIENT_TEXT =
  "bg-clip-text text-transparent bg-gradient-to-r from-[#2F4D7A] to-[#C43A2F]";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const webhookUrl = useMemo(() => {
    return (import.meta as any)?.env?.VITE_NEWSLETTER_WEBHOOK_URL as
      | string
      | undefined;
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim();

    if (!isValidEmail(clean)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      if (!webhookUrl) {
        setStatus("success");
        setMessage("You're in. Watch your inbox for updates.");
        setEmail("");
        return;
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: clean,
          source: "footer",
          createdAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
      setMessage("You're in. Watch your inbox for updates.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Couldn’t subscribe right now. Try again in a minute.");
    }
  };

  return (
    <footer
      className="w-full"
      style={{
        backgroundImage: `url(${footerBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Mobile: DO NOT force a full-viewport footer. Desktop/tablet: keep the full-height feel. */}
      <div className="w-full min-h-0 sm:min-h-[100svh]">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-10 xl:px-16 min-h-0 sm:min-h-[100svh] flex flex-col pb-6 sm:pb-10">
          {/* Top content */}
          <div className="pt-10 sm:pt-32">
            {/* Mailing list */}
            <div className="max-w-2xl">
              <p
                className={`uppercase tracking-[0.22em] text-[10px] font-semibold ${GRADIENT_TEXT}`}
              >
                Mailing list
              </p>

              <h2
                className={`mt-2 text-2xl sm:text-4xl font-extrabold uppercase tracking-widest leading-[1.08] ${GRADIENT_TEXT}`}
              >
                Get restock alerts &amp;
                <br />
                specials
              </h2>

              <p
                className={`mt-2 text-sm sm:text-base leading-relaxed ${GRADIENT_TEXT} opacity-90`}
              >
                New products, limited grow kits, bulk herbal drops, and discounts. No spam. No
                nonsense.
              </p>

              <form onSubmit={onSubmit} className="mt-4 sm:mt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status !== "idle") {
                        setStatus("idle");
                        setMessage("");
                      }
                    }}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    className="w-full sm:flex-1 rounded-2xl bg-white border border-black/15 px-4 py-3 text-black
                               placeholder:text-black/35 outline-none focus:border-black/30 transition"
                  />

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-2xl px-6 py-3 font-extrabold uppercase tracking-wider text-sm transition
                               text-white disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(47,77,122,1) 0%, rgba(196,58,47,1) 100%)",
                      boxShadow: "0 14px 34px rgba(0,0,0,0.12)",
                    }}
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe"}
                  </button>
                </div>

                <p className={`mt-2 text-[10px] ${GRADIENT_TEXT} opacity-70`}>
                  By subscribing, you agree to receive occasional marketing emails from Vaal
                  Exotics. Unsubscribe anytime.
                </p>

                {message ? (
                  <p
                    className="mt-2 text-sm"
                    style={{
                      color:
                        status === "error"
                          ? "rgba(196,58,47,0.95)"
                          : "rgba(47,77,122,0.95)",
                    }}
                  >
                    {message}
                  </p>
                ) : null}
              </form>
            </div>

            {/* Link grid */}
            {/* Mobile: 2 columns so it fits. Desktop unchanged. */}
            <div className="mt-8 sm:mt-14 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand (span both columns on mobile so it doesn't get squished) */}
              <div className="col-span-2 lg:col-span-1">
                <h3 className={`text-base font-extrabold tracking-tight ${GRADIENT_TEXT}`}>
                  VAAL EXOTICS
                </h3>
                <p className={`mt-3 text-sm leading-relaxed ${GRADIENT_TEXT} opacity-90`}>
                  Fresh. Exotic. Locally grown.
                  <br />
                  Family-run mushroom farm based in the Vaal.
                </p>
              </div>

              {/* Shop */}
              <div>
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${GRADIENT_TEXT} opacity-70`}
                >
                  Shop
                </h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link
                      className={`${GRADIENT_TEXT} hover:opacity-80 transition`}
                      to="/mushrooms/grow-kits"
                    >
                      Grow Kits
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`${GRADIENT_TEXT} hover:opacity-80 transition`}
                      to="/mushrooms/grain-and-cultures"
                    >
                      Grain &amp; Cultures
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`${GRADIENT_TEXT} hover:opacity-80 transition`}
                      to="/mushrooms/cultivation-supplies"
                    >
                      Cultivation Supplies
                    </Link>
                  </li>
                  <li>
                    <Link
                      className={`${GRADIENT_TEXT} hover:opacity-80 transition`}
                      to="/mushrooms/medicinal-supplements"
                    >
                      Medicinal Supplements
                    </Link>
                  </li>
                  <li>
                    <Link className={`${GRADIENT_TEXT} hover:opacity-80 transition`} to="/bulk-herbal">
                      Bulk Herbal
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Info */}
              <div>
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${GRADIENT_TEXT} opacity-70`}
                >
                  Info
                </h4>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>
                    <Link className={`${GRADIENT_TEXT} hover:opacity-80 transition`} to="/about">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link className={`${GRADIENT_TEXT} hover:opacity-80 transition`} to="/faq">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link className={`${GRADIENT_TEXT} hover:opacity-80 transition`} to="/disclaimer">
                      Disclaimer
                    </Link>
                  </li>
                  <li>
                    <Link className={`${GRADIENT_TEXT} hover:opacity-80 transition`} to="/cart">
                      Cart
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact (span both columns on mobile so it stays readable) */}
              <div className="col-span-2 lg:col-span-1">
                <h4
                  className={`text-xs font-semibold uppercase tracking-wider ${GRADIENT_TEXT} opacity-70`}
                >
                  Contact
                </h4>
                <div className="mt-3 space-y-2 text-sm">
                  <p className={`${GRADIENT_TEXT} opacity-90`}>Meyerton, South Africa</p>
                  <p className={`${GRADIENT_TEXT} opacity-90`}>Email: info@vaalexotics.co.za</p>
                  <p className={`${GRADIENT_TEXT} opacity-90`}>Phone: 078 216 6865</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-8 sm:mt-auto">
            {/* IMAGE STRIP */}
            <div className="w-full border-t border-black/10">
              <div className="w-screen relative left-1/2 -translate-x-1/2">
                <div
                  className="w-full h-[140px] sm:h-[300px]"
                  style={{
                    backgroundImage: `url(${footerCover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-3 pb-2">
              <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] sm:text-xs">
                <p className={`${GRADIENT_TEXT} opacity-70`}>
                  © {new Date().getFullYear()} Vaal Exotics. All rights reserved.
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className={`${GRADIENT_TEXT} opacity-70`}>
                    Proudly developed by Digital Solutions SA.
                  </p>

                  <Link
                    to="/admin"
                    className={`${GRADIENT_TEXT} opacity-70 hover:opacity-90 transition`}
                    aria-label="Admin login"
                  >
                    ADMIN
                  </Link>
                </div>
              </div>
            </div>
          </div>
          {/* end bottom block */}
        </div>
      </div>
    </footer>
  );
}