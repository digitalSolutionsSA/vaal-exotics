import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";
import Footer from "../components/layout/Footer";
import webBg from "../assets/web-bg.png";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ── Star rating ──────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 20 20"
          fill={i < rating ? "#d22c26" : "rgba(255,255,255,0.15)"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ── Review data ──────────────────────────────────────────────────────────────
const REVIEWS = [
  {
    name: "Sarah M.",
    location: "Cape Town",
    rating: 5,
    title: "Absolutely love this shop!",
    body: "My grow kit arrived perfectly packaged and I had my first flush within 10 days. The instructions were super clear and the support team answered my questions same day.",
    product: "Grow Kits",
    date: "Jan 2025",
    initials: "SM",
  },
  {
    name: "Liam T.",
    location: "Johannesburg",
    rating: 5,
    title: "Best grain spawn I've tried",
    body: "I've ordered from a few SA suppliers and Vaal Exotics is on another level. Clean cultures, fast colonisation, zero contamination across 6 bags. This is my go-to now.",
    product: "Grain & Cultures",
    date: "Dec 2024",
    initials: "LT",
  },
  {
    name: "Priya K.",
    location: "Durban",
    rating: 5,
    title: "Great quality supplements",
    body: "Been taking the Lion's Mane capsules for a month and the difference in focus is noticeable. Packaging is neat and professional, delivery was quicker than expected.",
    product: "Medicinal Supplements",
    date: "Jan 2025",
    initials: "PK",
  },
  {
    name: "Johan V.",
    location: "Pretoria",
    rating: 5,
    title: "Fantastic bulk herbs",
    body: "Ordered a large batch of bulk botanicals for my wellness business. Great value, well sealed, and labelled clearly. Will be placing a standing monthly order.",
    product: "Bulk Herbal",
    date: "Feb 2025",
    initials: "JV",
  },
  {
    name: "Anika R.",
    location: "Stellenbosch",
    rating: 5,
    title: "Perfect beginner experience",
    body: "Bought a grow kit as a gift and my partner is obsessed. The whole process was smooth from ordering to harvest. The little guide card inside is a lovely touch.",
    product: "Grow Kits",
    date: "Jan 2025",
    initials: "AR",
  },
  {
    name: "Deon P.",
    location: "Bloemfontein",
    rating: 5,
    title: "Reliable and professional",
    body: "Placed three orders now and every single one has been spot on. The cultivation supplies are exactly as described and the bags are top quality. Highly recommended.",
    product: "Cultivation Supplies",
    date: "Dec 2024",
    initials: "DP",
  },
];

// ── Fan carousel card ────────────────────────────────────────────────────────
// position: -2 (far back left) … 0 (center/active) … +2 (far back right)
function FanCard({
  review,
  position,
  onClick,
  isAnimating,
}: {
  review: (typeof REVIEWS)[0];
  position: number; // relative to active: 0=front, ±1, ±2, ±3
  onClick: () => void;
  isAnimating: boolean;
}) {
  const abs = Math.abs(position);
  const sign = position === 0 ? 0 : position > 0 ? 1 : -1;

  // Only render up to ±2 behind
  if (abs > 2) return null;

  const rotate = sign * abs * 8;
  const translateX = sign * abs * 110;
  const translateY = abs * 28;
  const scale = 1 - abs * 0.1;
  const zIndex = 10 - abs;
  const opacity = abs === 0 ? 1 : abs === 1 ? 0.65 : 0.35;

  return (
    <div
      onClick={abs > 0 ? onClick : undefined}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "520px",
        maxWidth: "78vw",
        transform: `translate(-50%, -50%) translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
        zIndex,
        opacity,
        cursor: abs > 0 ? "pointer" : "default",
        transition: isAnimating
          ? "transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 350ms ease"
          : "none",
      }}
    >
      {/* Card face */}
      <div
        className="rounded-3xl overflow-hidden border border-white/15"
        style={{
          background: "linear-gradient(155deg, #2a3550 0%, #3c496b 40%, #7a1a1a 75%, #d22c26 100%)",
          boxShadow: abs === 0
            ? "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)"
            : "0 16px 40px rgba(0,0,0,0.5)",
          minHeight: "340px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header stripe */}
        <div
          className="px-8 pt-7 pb-5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-base font-extrabold text-white flex-shrink-0"
              style={{
                background: "rgba(210,44,38,0.55)",
                border: "2px solid rgba(210,44,38,0.9)",
                boxShadow: "0 0 20px rgba(210,44,38,0.3)",
              }}
            >
              {review.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-white text-base leading-tight">{review.name}</p>
              <p className="text-sm text-white/50 mt-0.5">{review.location} · {review.date}</p>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
            >
              {review.product}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 pt-6 pb-8 flex flex-col flex-1">
          <Stars rating={review.rating} />

          <p className="mt-4 text-xl font-extrabold text-white leading-snug">
            "{review.title}"
          </p>

          <p className="mt-3 text-base text-white/72 leading-relaxed flex-1">
            {review.body}
          </p>

          {/* Verified */}
          <div className="mt-6 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-emerald-400 font-semibold">Verified purchase</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reviews section ──────────────────────────────────────────────────────────
function ReviewsSection({ sectionVisible }: { sectionVisible: boolean }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveIdx(idx);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  const next = useCallback(() => goTo((activeIdx + 1) % REVIEWS.length), [activeIdx, goTo]);
  const prev = useCallback(() => goTo((activeIdx - 1 + REVIEWS.length) % REVIEWS.length), [activeIdx, goTo]);

  // Auto-rotate
  useEffect(() => {
    if (!sectionVisible) return;
    autoRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % REVIEWS.length);
    }, 4000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [sectionVisible]);

  const resetAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % REVIEWS.length);
    }, 4000);
  };

  const handleNav = (fn: () => void) => {
    fn();
    resetAuto();
  };

  return (
    // Fills the entire viewport layer — h-full relative to the absolute inset-0 wrapper
    <div
      className="w-full select-none flex flex-col"
      style={{ height: "100svh" }}
    >
      {/* ── Heading — compact top strip ────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-end pb-4 flex-shrink-0"
        style={{
          height: "18%",
          transitionProperty: "opacity, transform",
          transitionDuration: "700ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "translateY(0px)" : "translateY(28px)",
        }}
      >
        {/* Stars + score */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="#d22c26">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-white font-extrabold text-xl">5.0</span>
          <span className="text-white/40 text-sm">· 200+ verified reviews</span>
        </div>

        <h2
          className="text-4xl sm:text-5xl font-extrabold uppercase tracking-widest text-white text-center"
          style={{ textShadow: "0 4px 28px rgba(0,0,0,0.75)" }}
        >
          What Our Customers Say
        </h2>
      </div>

      {/* ── Fan stack — middle half ────────────────────────────────── */}
      <div
        className="relative flex-1 w-full"
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "750ms",
          transitionDelay: "80ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "scale(1) translateY(0px)" : "scale(0.93) translateY(40px)",
        }}
      >
        {REVIEWS.map((r, i) => {
          const position = ((i - activeIdx + REVIEWS.length) % REVIEWS.length);
          const pos = position > REVIEWS.length / 2 ? position - REVIEWS.length : position;
          return (
            <FanCard
              key={r.name}
              review={r}
              position={pos}
              isAnimating={isAnimating}
              onClick={() => handleNav(() => goTo(i))}
            />
          );
        })}

        {/* Left arrow */}
        <button
          onClick={() => handleNav(prev)}
          className="absolute left-4 sm:left-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
          }}
          aria-label="Previous review"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Right arrow */}
        <button
          onClick={() => handleNav(next)}
          className="absolute right-4 sm:right-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
          }}
          aria-label="Next review"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ── Dot indicators — bottom strip ─────────────────────────── */}
      <div
        className="flex items-center justify-center gap-2 flex-shrink-0"
        style={{
          height: "7%",
          transitionProperty: "opacity",
          transitionDuration: "600ms",
          transitionDelay: "180ms",
          opacity: sectionVisible ? 1 : 0,
        }}
      >
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            onClick={() => handleNav(() => goTo(i))}
            style={{
              width: i === activeIdx ? "28px" : "7px",
              height: "7px",
              borderRadius: "9999px",
              background: i === activeIdx ? "#d22c26" : "rgba(255,255,255,0.3)",
              transition: "all 350ms cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: i === activeIdx ? "0 0 8px rgba(210,44,38,0.7)" : "none",
            }}
            aria-label={`Go to review ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────
// 4 stages mapped onto progress 0→1:
//   0.00–0.25  Hero
//   0.25–0.50  Featured Categories
//   0.50–0.75  Reviews (full viewport)
//   0.75–1.00  Footer
export default function Home() {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const SPEED = 0.0012;

  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100svh";

    const update = (delta: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const next = clamp(progressRef.current + delta * SPEED, 0, 1);
        progressRef.current = next;
        setProgress(next);
      });
    };

    const onWheel = (e: WheelEvent) => { e.preventDefault(); update(e.deltaY); };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const y = e.touches[0]?.clientY ?? 0;
      update((touchY - y) * 10);
      touchY = y;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
    };
  }, []);

  // Helper: given a progress value, compute fade+slide for a section
  // that lives in [inStart..inEnd] and exits at [outStart..outEnd]
  function sectionStyle(
    p: number,
    inStart: number, inEnd: number,
    outStart: number, outEnd: number,
    enterFrom: "bottom" | "top" = "bottom",
    exitTo: "top" | "bottom" = "top"
  ): React.CSSProperties {
    let o = 0, y = 0, scale = 1;
    const enterDir = enterFrom === "bottom" ? 1 : -1;
    const exitDir  = exitTo   === "top"    ? -1 : 1;

    if (p < inStart) {
      o = 0; y = enterDir * 60; scale = 0.96;
    } else if (p < inEnd) {
      const t = (p - inStart) / (inEnd - inStart);
      o = t; y = enterDir * (1 - t) * 60; scale = 0.96 + t * 0.04;
    } else if (p < outStart) {
      o = 1; y = 0; scale = 1;
    } else if (p < outEnd) {
      const t = (p - outStart) / (outEnd - outStart);
      o = 1 - t; y = exitDir * t * 70; scale = 1 - t * 0.04;
    } else {
      o = 0; y = exitDir * 70; scale = 0.96;
    }
    return {
      transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
      opacity: clamp(o, 0, 1),
      pointerEvents: (p < inStart || p > outEnd) ? "none" : "auto",
    };
  }

  // ── Per-layer styles ─────────────────────────────────────────────────────

  // HERO: active 0→0.22, exit 0.22→0.36
  const heroStyle = useMemo((): React.CSSProperties =>
    sectionStyle(progress, 0, 0, 0.22, 0.36, "bottom", "top"),
  [progress]);

  // FEATURED: enter 0.22→0.36, active 0.36→0.58, exit 0.58→0.72
  const featuredStyle = useMemo((): React.CSSProperties =>
    sectionStyle(progress, 0.22, 0.36, 0.58, 0.72, "bottom", "top"),
  [progress]);

  // REVIEWS: enter 0.58→0.72, active 0.72→0.86, exit 0.86→0.96
  const reviewsStyle = useMemo((): React.CSSProperties =>
    sectionStyle(progress, 0.58, 0.72, 0.86, 0.96, "bottom", "top"),
  [progress]);

  // FOOTER: enter 0.86→0.96, stays 0.96→1
  const footerStyle = useMemo((): React.CSSProperties =>
    sectionStyle(progress, 0.86, 0.96, 1.1, 1.2, "bottom", "top"),
  [progress]);

  const reviewsVisible = progress > 0.68;
  const activeSection =
    progress < 0.30 ? 0 :
    progress < 0.62 ? 1 :
    progress < 0.88 ? 2 : 3;

  const SECTION_LABELS = ["Home", "Shop", "Reviews", "Info"];

  return (
    <main className="bg-black text-white">
      <section className="relative h-[100svh] overflow-hidden">

        {/* Shared mushroom background — always visible */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${webBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Overlay darkens as footer approaches */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "rgba(0,0,0,0.5)",
            opacity: clamp((progress - 0.82) * 6, 0, 1),
          }}
        />

        {/* ── Layer 1: Hero ─────────────────────────────────────────── */}
        <div className="absolute inset-0" style={heroStyle}>
          <Hero />
        </div>

        {/* ── Layer 2: Featured Categories ──────────────────────────── */}
        <div className="absolute inset-0" style={featuredStyle}>
          <div className="h-full flex items-center">
            <div className="w-full">
              <FeaturedCategories />
            </div>
          </div>
        </div>

        {/* ── Layer 3: Reviews — full viewport ──────────────────────── */}
        <div className="absolute inset-0" style={reviewsStyle}>
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-full">
              <ReviewsSection sectionVisible={reviewsVisible} />
            </div>
          </div>
        </div>

        {/* ── Layer 4: Footer — slides up over everything ────────────── */}
        <div className="absolute inset-x-0 bottom-0" style={footerStyle}>
          <Footer />
        </div>

        {/* ── Section navigation dots ───────────────────────────────── */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
          {SECTION_LABELS.map((label, i) => (
            <div key={i} className="relative flex items-center justify-end gap-2">
              <span
                className="text-xs text-white/55 whitespace-nowrap pointer-events-none"
                style={{
                  opacity: activeSection === i ? 1 : 0,
                  transition: "opacity 300ms",
                }}
              >
                {label}
              </span>
              <div
                style={{
                  width: activeSection === i ? "10px" : "5px",
                  height: activeSection === i ? "10px" : "5px",
                  borderRadius: "50%",
                  background: activeSection === i ? "#d22c26" : "rgba(255,255,255,0.28)",
                  boxShadow: activeSection === i ? "0 0 10px rgba(210,44,38,0.9)" : "none",
                  transition: "all 350ms cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Scroll hint (hero only) ────────────────────────────────── */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
          style={{
            opacity: clamp(1 - progress * 10, 0, 1),
            pointerEvents: "none",
            transition: "opacity 300ms",
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div
              className="w-1 h-1.5 rounded-full bg-white/50"
              style={{ animation: "scrollDot 1.6s ease-in-out infinite" }}
            />
          </div>
        </div>

        <style>{`
          @keyframes scrollDot {
            0%   { transform: translateY(0);    opacity: 1; }
            80%  { transform: translateY(10px); opacity: 0; }
            100% { transform: translateY(0);    opacity: 0; }
          }
        `}</style>
      </section>
    </main>
  );
}