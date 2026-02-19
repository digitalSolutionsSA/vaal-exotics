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

const GRADIENT =
  "linear-gradient(170deg, #1e2a40 0%, #3c496b 40%, #8b1a1a 75%, #d22c26 100%)";

// ── Heading with fade-down ────────────────────────────────────────────────
function AnimatedHeading() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.25, rootMargin: "80px 0px -80px 0px" }
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
        transitionDuration: inView ? "750ms" : "300ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0px)" : "translateY(-18px)",
        willChange: "opacity, transform",
      }}
    >
      <h2
          className="text-4xl sm:text-5xl font-extrabold uppercase tracking-widest text-white text-center"
          style={{
            textShadow:
              "0 18px 60px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.88), 0 0 34px rgba(0,0,0,0.80)",
          }}
        >
          Shop by category
        </h2>

      <p className="mt-3 text-sm sm:text-base text-white/70">
        Pick what you need and jump straight into the good stuff.
      </p>
    </div>
  );
}

// ── Card: fall-from-sky animation, staggered ──────────────────────────────
function AnimatedCard({ cat, delay }: { cat: Cat; delay: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      {
        threshold: 0.18,
        rootMargin: "120px 0px -120px 0px",
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: inView ? "900ms" : "350ms",
        transitionDelay: inView ? `${delay}ms` : "0ms",
        transitionTimingFunction: inView
          ? "cubic-bezier(0.12, 0.85, 0.2, 1)"
          : "cubic-bezier(0.2, 0, 0.2, 1)",
        opacity: inView ? 1 : 0,
        transform: inView
          ? "translateY(0px) scale(1)"
          : "translateY(-90px) scale(0.985)",
        willChange: "opacity, transform",
      }}
    >
      <Link to={cat.to} className="group block h-full">
        <div
          className="
            relative flex flex-col h-full overflow-hidden rounded-xl
            border border-black/10 bg-white
            shadow-[0_12px_40px_rgba(0,0,0,0.25)]
            transition-all duration-300 ease-out
            group-hover:-translate-y-2
            group-hover:shadow-[0_22px_70px_rgba(0,0,0,0.35)]
          "
        >
          {/* Image */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <img
              src={cat.image}
              alt={cat.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
              draggable={false}
            />
          </div>

          {/* Content (white block + gradient text) */}
          <div className="flex flex-col flex-1 px-6 pt-5 pb-7">
            <h3
              className="text-lg font-extrabold tracking-wide leading-tight bg-clip-text text-transparent"
              style={{ backgroundImage: GRADIENT }}
            >
              {cat.title}
            </h3>

            <div className="mt-3 mb-3 h-px w-full bg-black/10" />

            <p className="text-sm text-black/60 leading-relaxed">{cat.subtitle}</p>

            <ul className="mt-4 space-y-2 flex-1">
              {cat.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-black/75">
                  <span
                    className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundImage: GRADIENT }}
                  />
                  {b}
                </li>
              ))}
            </ul>

            <div
              className="mt-5 flex items-center gap-1.5 text-sm font-semibold bg-clip-text text-transparent group-hover:opacity-80 transition-opacity"
              style={{ backgroundImage: GRADIENT }}
            >
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

// ── Main export ────────────────────────────────────────────────────────────
export default function FeaturedCategories() {
  return (
    <section className="relative w-full min-h-screen flex items-center">
      <div className="w-full px-6 sm:px-10 xl:px-16 py-16 sm:py-20">
        <AnimatedHeading />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {CATS.map((cat, i) => (
            <AnimatedCard key={cat.title} cat={cat} delay={i * 140} />
          ))}
        </div>
      </div>
    </section>
  );
}
