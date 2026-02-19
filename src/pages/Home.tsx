import { useEffect, useMemo, useRef, useState } from "react";
import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";
import ReviewsSection from "../components/home/ReviewsSection";
import Footer from "../components/layout/Footer";
import webBg from "../assets/web-bg.png";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
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

  // Smooth inertial scroll refs
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const isTickingRef = useRef(false);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.height = "100svh";

    // Tune these for feel
    const WHEEL_SENSITIVITY = 0.0009; // lower = slower
    const TOUCH_SENSITIVITY = 0.0013;
    const EASE = 0.12; // higher = snappier, lower = smoother
    const SNAP_EPS = 0.00008;

    // init
    targetRef.current = progressRef.current;
    currentRef.current = progressRef.current;

    const tick = () => {
      isTickingRef.current = true;

      const cur = currentRef.current;
      const tgt = targetRef.current;

      const next = cur + (tgt - cur) * EASE;
      currentRef.current = next;

      // snap when close
      const snapped = Math.abs(tgt - next) < SNAP_EPS ? tgt : next;
      currentRef.current = snapped;

      // Only re-render when meaningful change happens
      if (Math.abs(progressRef.current - snapped) > 0.0005) {
        progressRef.current = snapped;
        setProgress(snapped);
      }

      // keep ticking until we reach target
      if (Math.abs(tgt - currentRef.current) >= SNAP_EPS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        isTickingRef.current = false;
      }
    };

    const nudgeTo = (delta: number) => {
      targetRef.current = clamp(targetRef.current + delta, 0, 1);
      if (!isTickingRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    // Wheel
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // normalize for trackpads etc.
      const delta = clamp(e.deltaY, -120, 120) * WHEEL_SENSITIVITY;
      nudgeTo(delta);
    };

    // Touch
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const y = e.touches[0]?.clientY ?? 0;
      const dy = (touchY - y) * TOUCH_SENSITIVITY;
      nudgeTo(dy);
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

    if (p < inStart) {
      o = 0;
      y = enterDir * 60;
      scale = 0.96;
    } else if (p < inEnd) {
      const t = (p - inStart) / (inEnd - inStart);
      o = t;
      y = enterDir * (1 - t) * 60;
      scale = 0.96 + t * 0.04;
    } else if (p < outStart) {
      o = 1;
      y = 0;
      scale = 1;
    } else if (p < outEnd) {
      const t = (p - outStart) / (outEnd - outStart);
      o = 1 - t;
      y = exitDir * t * 70;
      scale = 1 - t * 0.04;
    } else {
      o = 0;
      y = exitDir * 70;
      scale = 0.96;
    }
    return {
      transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
      opacity: clamp(o, 0, 1),
      pointerEvents: p < inStart || p > outEnd ? "none" : "auto",
    };
  }

  // ── Per-layer styles ─────────────────────────────────────────────────────

  // HERO: active 0→0.22, exit 0.22→0.36
  const heroStyle = useMemo(
    (): React.CSSProperties =>
      sectionStyle(progress, 0, 0, 0.22, 0.36, "bottom", "top"),
    [progress]
  );

  // FEATURED: enter 0.22→0.36, active 0.36→0.58, exit 0.58→0.72
  const featuredStyle = useMemo(
    (): React.CSSProperties =>
      sectionStyle(progress, 0.22, 0.36, 0.58, 0.72, "bottom", "top"),
    [progress]
  );

  // REVIEWS: enter 0.58→0.72, active 0.72→0.86, exit 0.86→0.96
  const reviewsStyle = useMemo(
    (): React.CSSProperties =>
      sectionStyle(progress, 0.58, 0.72, 0.86, 0.96, "bottom", "top"),
    [progress]
  );

  // FOOTER: enter 0.86→0.96, stays 0.96→1
  const footerStyle = useMemo(
    (): React.CSSProperties =>
      sectionStyle(progress, 0.86, 0.96, 1.1, 1.2, "bottom", "top"),
    [progress]
  );

  const reviewsVisible = progress > 0.68;
  const activeSection =
    progress < 0.30 ? 0 : progress < 0.62 ? 1 : progress < 0.88 ? 2 : 3;

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
        <div className="absolute inset-0 will-change-transform" style={heroStyle}>
          <Hero />
        </div>

        {/* ── Layer 2: Featured Categories ──────────────────────────── */}
        <div className="absolute inset-0 will-change-transform" style={featuredStyle}>
          <div className="h-full flex items-center">
            <div className="w-full">
              <FeaturedCategories />
            </div>
          </div>
        </div>

        {/* ── Layer 3: Reviews — full viewport ──────────────────────── */}
        <div className="absolute inset-0 will-change-transform" style={reviewsStyle}>
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-full">
              <ReviewsSection sectionVisible={reviewsVisible} />
            </div>
          </div>
        </div>

        {/* ── Layer 4: Footer — slides up over everything ────────────── */}
        <div
          className="absolute inset-x-0 bottom-0 will-change-transform"
          style={footerStyle}
        >
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
                  background:
                    activeSection === i ? "#d22c26" : "rgba(255,255,255,0.28)",
                  boxShadow:
                    activeSection === i ? "0 0 10px rgba(210,44,38,0.9)" : "none",
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
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            Scroll
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
