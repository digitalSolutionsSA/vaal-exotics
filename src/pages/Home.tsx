import React, { useEffect, useMemo, useRef, useState } from "react";
import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";
import ReviewsSection from "../components/home/ReviewsSection";
import Footer from "../components/layout/Footer";
import webBg from "../assets/web-bg.png";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Smoothstep easing (feels pro, not linear-robot)
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Helper: fade+slide for a layer across a progress range
function sectionStyle(
  p: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
  enterFrom: "bottom" | "top" = "bottom",
  exitTo: "top" | "bottom" = "top"
): React.CSSProperties {
  let o = 0,
    y = 0,
    scale = 1;
  const enterDir = enterFrom === "bottom" ? 1 : -1;
  const exitDir = exitTo === "top" ? -1 : 1;

  // More restrained movement = more “professional”
  const ENTER_Y = 44;
  const EXIT_Y = 58;

  if (p < inStart) {
    o = 0;
    y = enterDir * ENTER_Y;
    scale = 0.985;
  } else if (p < inEnd) {
    const t = (p - inStart) / (inEnd - inStart || 1);
    o = t;
    y = enterDir * (1 - t) * ENTER_Y;
    scale = 0.985 + t * 0.015;
  } else if (p < outStart) {
    o = 1;
    y = 0;
    scale = 1;
  } else if (p < outEnd) {
    const t = (p - outStart) / (outEnd - outStart || 1);
    o = 1 - t;
    y = exitDir * t * EXIT_Y;
    scale = 1 - t * 0.02;
  } else {
    o = 0;
    y = exitDir * EXIT_Y;
    scale = 0.985;
  }

  return {
    transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
    opacity: clamp(o, 0, 1),
    pointerEvents: p < inStart || p > outEnd ? "none" : "auto",
  };
}

export default function Home() {
  // Discrete sections (0..3), each has a fixed progress anchor
  const SNAP_POINTS = useMemo(() => [0.0, 0.36, 0.72, 0.96], []);
  const SECTION_LABELS = ["Home", "Shop", "Reviews", "Info"];

  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(SNAP_POINTS[0]);

  const progressRef = useRef(progress);
  const activeIndexRef = useRef(activeIndex);

  const animRef = useRef<number | null>(null);
  const lockRef = useRef(false); // prevents multi-skip spam
  const lockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Animate progress to a snap point
  const animateTo = (nextIndex: number) => {
    const idx = clamp(nextIndex, 0, SNAP_POINTS.length - 1);
    const from = progressRef.current;
    const to = SNAP_POINTS[idx];

    setActiveIndex(idx);

    // Cancel any ongoing animation
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const DURATION = 520; // ms (fast enough to feel snappy, slow enough to feel premium)
    const start = performance.now();

    const step = (now: number) => {
      const t = clamp((now - start) / DURATION, 0, 1);
      const eased = easeOutCubic(t);
      const value = from + (to - from) * eased;
      progressRef.current = value;
      setProgress(value);

      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        progressRef.current = to;
        setProgress(to);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(step);
  };

  // One-step navigation with cooldown so trackpads don’t go berserk
  const go = (dir: 1 | -1) => {
    if (lockRef.current) return;

    lockRef.current = true;
    const next = activeIndexRef.current + dir;
    animateTo(next);

    // Cooldown (prevents skipping multiple sections on one gesture burst)
    if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(() => {
      lockRef.current = false;
    }, 450);
  };

  useEffect(() => {
    // Lock native scrolling because we’re controlling navigation
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevOverscroll = (document.documentElement.style as any).overscrollBehaviorY;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    (document.documentElement.style as any).overscrollBehaviorY = "none";

    // WHEEL: any scroll intent triggers next/prev, not a partial move
    let wheelAccum = 0;
    const WHEEL_DEADZONE = 8; // tiny threshold so gentle trackpad touches still count, but noise doesn’t

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccum += e.deltaY;

      if (Math.abs(wheelAccum) >= WHEEL_DEADZONE) {
        const dir: 1 | -1 = wheelAccum > 0 ? 1 : -1;
        wheelAccum = 0;
        go(dir);
      }
    };

    // TOUCH: swipe direction decides next/prev, distance doesn’t matter after deadzone
    let startY = 0;
    let moved = 0;
    const TOUCH_DEADZONE = 10; // px

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
      moved = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      // Prevent browser from trying to scroll page
      e.preventDefault();
      const y = e.touches[0]?.clientY ?? 0;
      moved = startY - y; // swipe up => positive
    };

    const onTouchEnd = () => {
      if (Math.abs(moved) < TOUCH_DEADZONE) return;
      const dir: 1 | -1 = moved > 0 ? 1 : -1;
      go(dir);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (lockTimerRef.current) window.clearTimeout(lockTimerRef.current);

      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd as any);

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      (document.documentElement.style as any).overscrollBehaviorY = prevOverscroll;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SNAP_POINTS]);

  // ── Layer styles (same ranges you had, still looks the same) ───────────────
  const heroStyle = useMemo(
    (): React.CSSProperties => sectionStyle(progress, 0, 0, 0.22, 0.36, "bottom", "top"),
    [progress]
  );

  const featuredStyle = useMemo(
    (): React.CSSProperties => sectionStyle(progress, 0.22, 0.36, 0.58, 0.72, "bottom", "top"),
    [progress]
  );

  const reviewsStyle = useMemo(
    (): React.CSSProperties => sectionStyle(progress, 0.58, 0.72, 0.86, 0.96, "bottom", "top"),
    [progress]
  );

  const footerStyle = useMemo(
    (): React.CSSProperties => sectionStyle(progress, 0.86, 0.96, 1.1, 1.2, "bottom", "top"),
    [progress]
  );

  const reviewsVisible = progress > 0.68;
  const shouldMountReviews = progress >= 0.58; // mount when entering reviews stage

  return (
    <main className="bg-black text-white">
      <section className="relative min-h-[100svh] overflow-hidden">
        {/* Shared background */}
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

        {/* Layer 1: Hero */}
        <div className="absolute inset-0 will-change-transform" style={heroStyle}>
          <Hero />
        </div>

        {/* Layer 2: Featured */}
        <div className="absolute inset-0 will-change-transform" style={featuredStyle}>
          <div className="h-full flex items-center">
            <div className="w-full">
              <FeaturedCategories />
            </div>
          </div>
        </div>

        {/* Layer 3: Reviews */}
        <div className="absolute inset-0 will-change-transform" style={reviewsStyle}>
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-full">
              {shouldMountReviews ? <ReviewsSection sectionVisible={reviewsVisible} /> : null}
            </div>
          </div>
        </div>

        {/* Layer 4: Footer */}
        <div className="absolute inset-x-0 bottom-0 will-change-transform" style={footerStyle}>
          <Footer />
        </div>

        {/* Section navigation dots (now reflect activeIndex, not fuzzy progress) */}
        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50">
          {SECTION_LABELS.map((label, i) => (
            <div key={i} className="relative flex items-center justify-end gap-2">
              <span
                className="text-xs text-white/55 whitespace-nowrap pointer-events-none"
                style={{
                  opacity: activeIndex === i ? 1 : 0,
                  transition: "opacity 220ms ease",
                }}
              >
                {label}
              </span>
              <div
                style={{
                  width: activeIndex === i ? "10px" : "6px",
                  height: activeIndex === i ? "10px" : "6px",
                  borderRadius: "50%",
                  background: activeIndex === i ? "#d22c26" : "rgba(255,255,255,0.28)",
                  boxShadow: activeIndex === i ? "0 0 10px rgba(210,44,38,0.75)" : "none",
                  transition:
                    "width 260ms cubic-bezier(0.34,1.56,0.64,1), height 260ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease, box-shadow 200ms ease",
                }}
              />
            </div>
          ))}
        </div>

        {/* Scroll hint (hero only) */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
          style={{
            opacity: clamp(1 - progress * 10, 0, 1),
            pointerEvents: "none",
            transition: "opacity 220ms ease",
          }}
        >
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Swipe / Scroll
          </span>
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