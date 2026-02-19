import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import footerBg from "../../assets/footer-bg.png";
import footerCover from "../../assets/footer-cover.png";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeWhatsappNumber(raw?: string) {
  if (!raw) return "";
  return raw.replace(/\s+/g, "").replace(/^\+/, "");
}

const BRAND_GRADIENT =
  "linear-gradient(90deg, #1e2a40 0%, #3c496b 35%, #8b1a1a 70%, #d22c26 100%)";

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

  const whatsappNumber = useMemo(() => {
    return normalizeWhatsappNumber(
      (import.meta as any)?.env?.VITE_VAAL_EXOTICS_WHATSAPP as string | undefined
    );
  }, []);

  // Not used in footer anymore (you removed the top WA button), but harmless to keep.
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : "https://wa.me/";

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

  // Simple helper style for gradient text
  const gradientTextStyle: React.CSSProperties = {
    backgroundImage: BRAND_GRADIENT,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };

  return (
    <footer
      className="w-full text-black"
      style={{
        backgroundImage: `url(${footerBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="w-full min-h-[100svh]">
        <div className="mx-auto w-full max-w-[1600px] px-6 sm:px-10 xl:px-16 min-h-[100svh] flex flex-col">
          {/* Top Content */}
          <div className="pt-20 sm:pt-24">
            {/* Mailing List */}
            <div className="max-w-2xl">
              <p className="text-black/55 uppercase tracking-[0.22em] text-[10px] font-semibold">
                Mailing list
              </p>

              {/* ✅ Gradient headline restored */}
              <h2
                className="mt-2 text-3xl sm:text-4xl font-extrabold uppercase tracking-widest leading-[1.05]"
                style={gradientTextStyle}
              >
                Get restock alerts &amp;
                <br />
                specials
              </h2>

              <p className="mt-3 text-sm sm:text-base text-black/60 leading-relaxed">
                New products, limited grow kits, bulk herbal drops, and discounts. No spam. No
                nonsense.
              </p>

              <form onSubmit={onSubmit} className="mt-6">
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
                    placeholder="Enter your email"
                    className="w-full sm:flex-1 rounded-2xl bg-white border border-black/15
                               px-4 py-3 text-black placeholder:text-black/35
                               outline-none focus:border-black/30
                               shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition"
                  />

                  {/* Button stays red like your original */}
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="rounded-2xl px-6 py-3 font-extrabold uppercase tracking-wider text-sm text-white
                               bg-[#d22c26] hover:brightness-110 active:scale-[0.98]
                               disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {status === "loading" ? "Subscribing..." : "Subscribe"}
                  </button>
                </div>

                <p className="mt-3 text-[10px] text-black/40">
                  By subscribing, you agree to receive occasional marketing emails from Vaal Exotics.
                  Unsubscribe anytime.
                </p>

                {message && (
                  <p
                    className="mt-2 text-sm"
                    style={{
                      color:
                        status === "error"
                          ? "rgba(220,38,38,0.95)"
                          : "rgba(16,185,129,0.95)",
                    }}
                  >
                    {message}
                  </p>
                )}
              </form>
            </div>

            {/* Link Grid */}
            <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                {/* ✅ Gradient brand restored */}
                <h3 className="text-base font-extrabold tracking-tight" style={gradientTextStyle}>
                  VAAL EXOTICS
                </h3>
                <p className="mt-4 text-sm text-black/60 leading-relaxed">
                  Fresh. Exotic. Locally grown.
                  <br />
                  Family-run mushroom farm based in the Vaal.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-black/45">
                  Shop
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-black/65">
                  <li>
                    <Link
                      to="/mushrooms/grow-kits"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Grow Kits
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/mushrooms/grain-and-cultures"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Grain &amp; Cultures
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/mushrooms/cultivation-supplies"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Cultivation Supplies
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/mushrooms/medicinal-supplements"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Medicinal Supplements
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/bulk-herbal"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Bulk Herbal
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-black/45">
                  Info
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-black/65">
                  <li>
                    <Link to="/about" className="hover:opacity-80 transition" style={gradientTextStyle}>
                      About
                    </Link>
                  </li>
                  <li>
                    <Link to="/faq" className="hover:opacity-80 transition" style={gradientTextStyle}>
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/disclaimer"
                      className="hover:opacity-80 transition"
                      style={gradientTextStyle}
                    >
                      Disclaimer
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart" className="hover:opacity-80 transition" style={gradientTextStyle}>
                      Cart
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-black/45">
                  Contact
                </h4>
                <div className="mt-4 space-y-3 text-sm text-black/65">
                  <p>Meyerton, South Africa</p>
                  <p>Email: info@vaalexotics.co.za</p>
                  <p>Phone: 078 216 6865</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom image strip (unchanged) */}
          <div className="mt-auto pb-6">
            <div className="w-full border-t border-black/10">
              <div className="w-screen relative left-1/2 -translate-x-1/2">
                <div
                  className="w-full"
                  style={{
                    height: "300px",
                    backgroundImage: `url(${footerCover})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-4 pb-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-black/50">
                <p>© {new Date().getFullYear()} Vaal Exotics. All rights reserved.</p>

                <div className="flex items-center gap-6">
                  <p>Proudly developed by Digital Solutions SA.</p>
                  <Link to="/admin" className="hover:opacity-70 transition">
                    ADMIN
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
