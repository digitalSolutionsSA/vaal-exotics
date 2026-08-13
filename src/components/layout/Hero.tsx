import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const vaalRef = useRef<HTMLHeadingElement>(null);
  const exoticsRef = useRef<HTMLHeadingElement>(null);
  const mushroomBtnRef = useRef<HTMLAnchorElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const heightRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Cache section height — avoid forced layout reads on every scroll tick
    const updateHeight = () => { heightRef.current = section.offsetHeight; };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(section);

    const onScroll = () => {
      const height = heightRef.current;
      if (!height) return;

      const progress = Math.min(window.scrollY / (height * 0.35), 1);

      if (vaalRef.current) {
        vaalRef.current.style.transform = `translateX(${-progress * 140}px) translateY(${-progress * 30}px)`;
        vaalRef.current.style.opacity = `${1 - progress * 1.4}`;
      }

      if (exoticsRef.current) {
        exoticsRef.current.style.transform = `translateX(${progress * 140}px) translateY(${progress * 30}px)`;
        exoticsRef.current.style.opacity = `${1 - progress * 1.4}`;
      }

      if (mushroomBtnRef.current) {
        mushroomBtnRef.current.style.transform = `translateY(${progress * 60}px) scale(${1 - progress * 0.15})`;
        mushroomBtnRef.current.style.opacity = `${1 - progress * 2}`;
      }

      if (bgRef.current) {
        bgRef.current.style.transform = `scale(${1 + progress * 0.12})`;
        bgRef.current.style.opacity = `${1 - progress * 0.3}`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[100svh] w-full flex items-center justify-center"
    >
      <div
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: "url('/web-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center text-center gap-6 sm:gap-10">
          {/* Heading row — stacked on mobile, one line on sm+ */}
          <div className="flex flex-col items-center sm:flex-row sm:items-baseline gap-0 sm:gap-8">
            <h1
              ref={vaalRef}
              className="text-[37vw] sm:text-[clamp(4rem,14vw,18rem)] leading-none text-white uppercase m-0 will-change-transform"
              style={{
                fontFamily: "Oswald, sans-serif",
                fontWeight: 200,
                letterSpacing: "0.02em",
              }}
            >
              VAAL
            </h1>
            <h1
              ref={exoticsRef}
              className="text-[22vw] sm:text-[clamp(4rem,14vw,18rem)] leading-none text-white uppercase m-0 will-change-transform"
              style={{
                fontFamily: "Oswald, sans-serif",
                fontWeight: 200,
                letterSpacing: "0.02em",
              }}
            >
              EXOTICS
            </h1>
          </div>

          {/* Button below the heading */}
          <Link
            ref={mushroomBtnRef}
            to="/products"
            className="
              inline-flex items-center justify-center
              w-[72vw] py-4
              text-sm sm:text-base
              font-black tracking-[0.12em] uppercase
              bg-[#C43A2F] text-white
              hover:brightness-110 hover:scale-[1.02]
              active:scale-[0.98]
              shadow-xl will-change-transform
            "
            style={{
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            SHOP MUSHROOM RANGE
          </Link>
        </div>
      </div>
    </section>
  );
}