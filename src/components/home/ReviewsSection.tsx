import React, { useEffect, useMemo, useRef, useState } from "react";

/** ── Star rating ────────────────────────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill={i < rating ? "#d22c26" : "rgba(255,255,255,0.15)"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** ── Review data ────────────────────────────────────────────────────────── */
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

  // More reviews (so the marquee feels “alive” and continuous)
  {
    name: "Thabo N.",
    location: "Soweto",
    rating: 5,
    title: "Proper service and fast delivery",
    body: "Ordered grain and it arrived quicker than expected. Everything was clean and well packed. Will definitely order again.",
    product: "Grain & Cultures",
    date: "Nov 2024",
    initials: "TN",
  },
  {
    name: "Megan S.",
    location: "Gqeberha",
    rating: 5,
    title: "Quality is top tier",
    body: "Medicinal products feel premium and the communication was great. Packaging looks professional and trustworthy.",
    product: "Medicinal Supplements",
    date: "Oct 2024",
    initials: "MS",
  },
  {
    name: "Kyle B.",
    location: "Centurion",
    rating: 5,
    title: "Beginner-friendly and smooth",
    body: "First time growing mushrooms and it went surprisingly well. Instructions were clear and the kit quality is solid.",
    product: "Grow Kits",
    date: "Sep 2024",
    initials: "KB",
  },
  {
    name: "Zanele D.",
    location: "Sandton",
    rating: 5,
    title: "Great value in bulk",
    body: "Bulk herbs were well sealed, consistent quality, and labelled nicely. Perfect for my wellness blends.",
    product: "Bulk Herbal",
    date: "Jan 2025",
    initials: "ZD",
  },
  {
    name: "Ahmed R.",
    location: "Kimberley",
    rating: 5,
    title: "Clean, accurate, professional",
    body: "Everything matched the description and the supplies are high quality. No nonsense, just good products.",
    product: "Cultivation Supplies",
    date: "Nov 2024",
    initials: "AR",
  },
  {
    name: "Chanté L.",
    location: "Paarl",
    rating: 5,
    title: "Packaging is excellent",
    body: "Honestly impressed. It looks and feels like a premium brand. The little details make a big difference.",
    product: "Grow Kits",
    date: "Dec 2024",
    initials: "CL",
  },
];

function ReviewPill({ label }: { label: string }) {
  return (
    <span
      className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.10)",
        color: "rgba(255,255,255,0.72)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      {label}
    </span>
  );
}

/** Brand-tinted “glass” gradient (very light, logo colors) */
const CARD_BG =
  "linear-gradient(135deg, rgba(210,44,38,0.10) 0%, rgba(47,77,122,0.10) 55%, rgba(255,255,255,0.06) 100%)";

function ReviewCard({
  r,
  onOpen,
}: {
  r: (typeof REVIEWS)[number];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "group text-left select-none",
        "w-[320px] sm:w-[380px] md:w-[420px]",
        "rounded-3xl overflow-hidden",
        "border border-white/12",
        "backdrop-blur-md",
        "transition",
      ].join(" ")}
      style={{
        background: CARD_BG,
        boxShadow:
          "0 14px 34px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
      aria-label={`Open review by ${r.name}`}
    >
      {/* Top strip */}
      <div
        className="px-6 pt-5 pb-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold text-white flex-shrink-0"
            style={{
              background: "rgba(210,44,38,0.32)",
              border: "2px solid rgba(210,44,38,0.7)",
              boxShadow: "0 0 16px rgba(210,44,38,0.22)",
            }}
          >
            {r.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-white leading-tight truncate">
              {r.name}
            </div>
            <div className="text-xs text-white/55 mt-0.5 truncate">
              {r.location} · {r.date}
            </div>
          </div>

          <ReviewPill label={r.product} />
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pt-5 pb-6">
        <Stars rating={r.rating} />

        <div className="mt-3 text-[15px] font-extrabold text-white leading-snug line-clamp-1">
          “{r.title}”
        </div>

        <div className="mt-2 text-sm text-white/75 leading-relaxed line-clamp-3">
          {r.body}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-emerald-400 font-semibold">
            Verified purchase
          </span>

          {/* Removed “Tap to read” as requested */}
        </div>
      </div>
    </button>
  );
}

/**
 * Pixel-perfect marquee:
 * - Measure the first group's width in px (including its internal gap spacing)
 * - Animate translateX by exactly that width
 * This removes % rounding/jumps permanently.
 */
function useMarqueePx({
  groupRef,
  speedPxPerSec,
  enabled,
}: {
  groupRef: React.RefObject<HTMLDivElement | null>;
  speedPxPerSec: number;
  enabled: boolean;
}) {
  const [shiftPx, setShiftPx] = useState(1200);
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    if (!enabled) return;

    const compute = () => {
      const el = groupRef.current;
      if (!el) return;

      // offsetWidth is stable for layout width (and includes padding/borders)
      const w = el.offsetWidth;
      if (!w || !Number.isFinite(w)) return;

      setShiftPx(w);
      const seconds = w / speedPxPerSec;
      setDuration(Math.max(12, Math.min(120, seconds)));
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (groupRef.current) ro.observe(groupRef.current);

    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("resize", compute);
      ro.disconnect();
    };
  }, [enabled, speedPxPerSec, groupRef]);

  return { shiftPx, duration };
}

function ReviewModal({
  open,
  onClose,
  review,
}: {
  open: boolean;
  onClose: () => void;
  review: (typeof REVIEWS)[number] | null;
}) {
  if (!open || !review) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0b0f17]/90 backdrop-blur-xl p-6 sm:p-7"
        style={{
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">
              Review
            </div>
            <div className="mt-1 text-2xl font-extrabold text-white">
              “{review.title}”
            </div>
            <div className="mt-2 text-sm text-white/55">
              {review.name} · {review.location} · {review.date} ·{" "}
              <span className="text-white/75 font-semibold">
                {review.product}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition grid place-items-center"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <Stars rating={review.rating} />
        </div>

        <p className="mt-4 text-base text-white/80 leading-relaxed whitespace-pre-line">
          {review.body}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm text-emerald-400 font-semibold">
            Verified purchase
          </span>
        </div>
      </div>
    </div>
  );
}

/** ── Reviews section (Marquee) ───────────────────────────────────────────── */
export default function ReviewsSection({
  sectionVisible,
}: {
  sectionVisible: boolean;
}) {
  // Only pause when modal is open.
  const [paused, setPaused] = useState(false);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<(typeof REVIEWS)[number] | null>(null);

  // Group refs (measure width in px)
  const group1Ref = useRef<HTMLDivElement | null>(null);
  const group2Ref = useRef<HTMLDivElement | null>(null);

  const [rowA, rowB] = useMemo(() => {
    const a = REVIEWS.filter((_, i) => i % 2 === 0);
    const b = REVIEWS.filter((_, i) => i % 2 === 1);
    return [a.length ? a : REVIEWS, b.length ? b : REVIEWS];
  }, []);

  const m1 = useMarqueePx({
    groupRef: group1Ref,
    speedPxPerSec: 90, // slightly faster = feels smoother
    enabled: sectionVisible,
  });

  const m2 = useMarqueePx({
    groupRef: group2Ref,
    speedPxPerSec: 72,
    enabled: sectionVisible,
  });

  const openReview = (r: (typeof REVIEWS)[number]) => {
    setActive(r);
    setOpen(true);
    setPaused(true);
  };

  const closeReview = () => {
    setOpen(false);
    setActive(null);
    setPaused(false);
  };

  return (
    <div className="w-full select-none flex flex-col" style={{ height: "100svh" }}>
      {/* Heading */}
      <div
        className="flex flex-col items-center justify-end pb-7 flex-shrink-0"
        style={{
          height: "26%",
          paddingTop: "56px",
          transitionProperty: "opacity, transform",
          transitionDuration: "700ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "translateY(0px)" : "translateY(28px)",
        }}
      >
        <h2
          className="text-4xl sm:text-5xl font-extrabold uppercase tracking-widest text-white text-center"
          style={{
            textShadow:
              "0 18px 60px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.88), 0 0 34px rgba(0,0,0,0.80)",
          }}
        >
          What Our Customers Say
        </h2>

        {/* Rating line */}
        <div
          className="flex items-center gap-2 mt-4"
          style={{
            filter:
              "drop-shadow(0 16px 28px rgba(0,0,0,0.98)) drop-shadow(0 0 26px rgba(0,0,0,0.80))",
          }}
        >
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="#d22c26">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a 1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-white font-extrabold text-xl">5.0</span>
          <span className="text-white/65 text-sm">· 200+ verified reviews</span>
        </div>

        {/* This text now ALSO stands out */}
        <p
          className="mt-3 text-xs sm:text-sm text-white/70"
          style={{
            textShadow:
              "0 12px 34px rgba(0,0,0,0.98), 0 2px 10px rgba(0,0,0,0.90)",
          }}
        >
        
        </p>
      </div>

      {/* Marquee lanes */}
      <div
        className="relative flex-1 w-full"
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: "750ms",
          transitionDelay: "80ms",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? "translateY(0px)" : "translateY(40px)",
        }}
      >
        {/* Soft edge fade */}
        <div
          className="absolute inset-0 z-20 pointer-events-none"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        />

        {/* Lane 1 */}
        <div className="absolute left-0 right-0" style={{ top: "14%" }}>
          <div className="overflow-hidden">
            <div
              className="flex w-max"
              style={{
                // pixel-based shift
                ["--shift" as any]: `${m1.shiftPx}px`,
                animation:
                  sectionVisible && !paused
                    ? `marqueePx ${m1.duration}s linear infinite`
                    : "none",
                willChange: "transform",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden",
              }}
            >
              {/* group */}
              <div ref={group1Ref} className="flex items-stretch gap-4 pr-4">
                {rowA.map((r, idx) => (
                  <ReviewCard
                    key={`${r.name}_${r.date}_a_${idx}`}
                    r={r}
                    onOpen={() => openReview(r)}
                  />
                ))}
              </div>

              {/* duplicate */}
              <div className="flex items-stretch gap-4 pr-4" aria-hidden="true">
                {rowA.map((r, idx) => (
                  <ReviewCard
                    key={`${r.name}_${r.date}_a_dup_${idx}`}
                    r={r}
                    onOpen={() => openReview(r)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lane 2 (reverse) */}
        <div className="absolute left-0 right-0" style={{ top: "54%" }}>
          <div className="overflow-hidden">
            <div
              className="flex w-max"
              style={{
                ["--shift" as any]: `${m2.shiftPx}px`,
                animation:
                  sectionVisible && !paused
                    ? `marqueePxReverse ${m2.duration}s linear infinite`
                    : "none",
                willChange: "transform",
                transform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden",
              }}
            >
              <div ref={group2Ref} className="flex items-stretch gap-4 pr-4">
                {rowB.map((r, idx) => (
                  <ReviewCard
                    key={`${r.name}_${r.date}_b_${idx}`}
                    r={r}
                    onOpen={() => openReview(r)}
                  />
                ))}
              </div>

              <div className="flex items-stretch gap-4 pr-4" aria-hidden="true">
                {rowB.map((r, idx) => (
                  <ReviewCard
                    key={`${r.name}_${r.date}_b_dup_${idx}`}
                    r={r}
                    onOpen={() => openReview(r)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes marqueePx {
            0%   { transform: translate3d(0,0,0); }
            100% { transform: translate3d(calc(-1 * var(--shift)),0,0); }
          }
          @keyframes marqueePxReverse {
            0%   { transform: translate3d(calc(-1 * var(--shift)),0,0); }
            100% { transform: translate3d(0,0,0); }
          }
        `}</style>
      </div>

      <ReviewModal open={open} onClose={closeReview} review={active} />
    </div>
  );
}
