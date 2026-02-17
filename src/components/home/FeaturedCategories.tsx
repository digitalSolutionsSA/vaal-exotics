import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import growImg from "../../assets/grow-bg.png";
import grainImg from "../../assets/grain-bg.png";
import suppliesImg from "../../assets/supplies-bg.png";
import medicinalImg from "../../assets/medicinal-bg.png";
import herbalImg from "../../assets/herbal-bg.png";

type Cat = {
  title: string;
  subtitle: string;
  bullets: string[];
  to: string;
  image: string;
};

const CATS: Cat[] = [
  {
    title: "Grow Kits",
    subtitle: "Beginner-friendly kits for clean home harvests.",
    bullets: ["Great for beginners", "Step-by-step simple", "Perfect gifts"],
    to: "/shop/growkits",
    image: growImg,
  },
  {
    title: "Grain & Cultures",
    subtitle: "Reliable genetics and spawn to level up your grows.",
    bullets: ["Quality cultures", "Clean grain options", "Consistent results"],
    to: "/shop/grain-and-cultures",
    image: grainImg,
  },
  {
    title: "Cultivation Supplies",
    subtitle: "Bags, tools, substrates, and the stuff that actually matters.",
    bullets: ["Grow-ready supplies", "Stock up easily", "Better yields"],
    to: "/shop/cultivation-supplies",
    image: suppliesImg,
  },
  {
    title: "Medicinal Supplements",
    subtitle: "Functional mushroom products for daily routines.",
    bullets: ["Everyday support", "Easy routines", "Trusted ingredients"],
    to: "/shop/medicinal-supplements",
    image: medicinalImg,
  },
  {
    title: "Bulk Herbal",
    subtitle: "Bulk herbs & botanicals for serious stock-ups.",
    bullets: ["Bulk-friendly", "Great value", "Wide selection"],
    to: "/shop/bulk-herbal",
    image: herbalImg,
  },
];

// ── Per-card scroll-triggered fade-up ─────────────────────────────────────
function AnimatedCard({ cat, delay }: { cat: Cat; delay: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "680ms",
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(40px)",
      }}
    >
      <Link to={cat.to} className="group block h-full">
        <div
          className="
            relative flex flex-col h-full overflow-hidden rounded-xl
            border border-white/10
            shadow-[0_10px_40px_rgba(0,0,0,0.55)]
            transition-all duration-300 ease-out
            group-hover:-translate-y-2
            group-hover:shadow-[0_20px_60px_rgba(210,44,38,0.4)]
            group-hover:border-white/25
          "
          style={{ background: "#0c0c10" }}
        >
          {/* Image */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <img
              src={cat.image}
              alt={cat.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              style={{ filter: "brightness(0.85) saturate(0.7)" }}
              loading="lazy"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-20"
              style={{ background: "linear-gradient(to bottom, transparent, #1e2a40)" }}
            />
          </div>

          {/* Content */}
          <div
            className="flex flex-col flex-1 px-5 pt-4 pb-6"
            style={{
              background:
                "linear-gradient(170deg, #1e2a40 0%, #3c496b 40%, #8b1a1a 75%, #d22c26 100%)",
            }}
          >
            <h3 className="text-lg font-bold tracking-wide text-white leading-tight">
              {cat.title}
            </h3>

            <div className="mt-3 mb-3 h-px w-full bg-white/15" />

            <p className="text-sm text-white/70 leading-relaxed">{cat.subtitle}</p>

            <ul className="mt-4 space-y-2 flex-1">
              {cat.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-white/85">
                  <span
                    className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ background: "#d22c26" }}
                  />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-white/70 group-hover:text-white transition-colors duration-200">
              <span>Shop now</span>
              <svg
                className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ── Heading with its own fade-down ─────────────────────────────────────────
function AnimatedHeading() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="text-center mb-12"
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "700ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(20px)",
      }}
    >
      <h2
        className="text-4xl sm:text-5xl font-extrabold uppercase tracking-widest text-white"
        style={{ textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}
      >
        Shop by Category
      </h2>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function FeaturedCategories() {
  return (
    <section className="relative w-full min-h-screen flex items-center">
      <div className="w-full px-6 sm:px-10 xl:px-16 py-16 sm:py-20">
        <AnimatedHeading />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATS.map((cat, i) => (
            <AnimatedCard key={cat.title} cat={cat} delay={i * 130} />
          ))}
        </div>
      </div>
    </section>
  );
}