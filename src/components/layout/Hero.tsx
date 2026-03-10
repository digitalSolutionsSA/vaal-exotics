import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import webBg from "../../assets/web-bg.png";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const vaalRef = useRef<HTMLHeadingElement>(null);
  const exoticsRef = useRef<HTMLHeadingElement>(null);
  const herbalBtnRef = useRef<HTMLAnchorElement>(null);
  const mushroomBtnRef = useRef<HTMLAnchorElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const scrollY = window.scrollY;
      const height = section.offsetHeight;

      const progress = Math.min(scrollY / (height * 0.35), 1);

      if (vaalRef.current) {
        vaalRef.current.style.transform = `translateX(${-progress * 140}px) translateY(${-progress * 30}px)`;
        vaalRef.current.style.opacity = `${1 - progress * 1.4}`;
        vaalRef.current.style.filter = `blur(${progress * 8}px)`;
      }

      if (exoticsRef.current) {
        exoticsRef.current.style.transform = `translateX(${progress * 140}px) translateY(${progress * 30}px)`;
        exoticsRef.current.style.opacity = `${1 - progress * 1.4}`;
        exoticsRef.current.style.filter = `blur(${progress * 8}px)`;
      }

      if (herbalBtnRef.current) {
        herbalBtnRef.current.style.transform = `translateY(${-progress * 60}px) scale(${1 - progress * 0.15})`;
        herbalBtnRef.current.style.opacity = `${1 - progress * 2}`;
      }

      if (mushroomBtnRef.current) {
        mushroomBtnRef.current.style.transform = `translateY(${progress * 60}px) scale(${1 - progress * 0.15})`;
        mushroomBtnRef.current.style.opacity = `${1 - progress * 2}`;
      }

      if (bgRef.current) {
        bgRef.current.style.transform = `scale(${1 + progress * 0.12})`;
        bgRef.current.style.filter = `brightness(${1 - progress * 0.3})`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[100svh] w-full flex items-center justify-center"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      <div
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: `url(${webBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          transition: "transform 0.05s linear, filter 0.05s linear",
        }}
      />

      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative z-10 w-full px-4 sm:px-6 flex items-center justify-center">
        <div
          className="
            w-full max-w-[1200px]
            flex flex-col items-center justify-center text-center gap-4
            sm:grid sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 sm:gap-y-2 sm:items-center sm:justify-items-center
          "
        >
          <h1
            ref={vaalRef}
            className="
              text-[clamp(4.5rem,18vw,16rem)] sm:text-[clamp(6rem,21vw,16rem)]
              leading-none text-white uppercase m-0 will-change-transform
              order-1
              sm:order-none sm:col-start-1 sm:row-start-1
            "
            style={{
              fontFamily: "Oswald, sans-serif",
              fontWeight: 200,
              letterSpacing: "0.02em",
              transition:
                "transform 0.05s linear, opacity 0.05s linear, filter 0.05s linear",
            }}
          >
            VAAL
          </h1>

          <h1
            ref={exoticsRef}
            className="
              text-[clamp(4.5rem,18vw,16rem)] sm:text-[clamp(6rem,21vw,16rem)]
              leading-none text-white uppercase m-0 will-change-transform
              order-2
              sm:order-none sm:col-start-2 sm:row-start-2
            "
            style={{
              fontFamily: "Oswald, sans-serif",
              fontWeight: 200,
              letterSpacing: "0.02em",
              transition:
                "transform 0.05s linear, opacity 0.05s linear, filter 0.05s linear",
            }}
          >
            EXOTICS
          </h1>

          {/* ✅ ONLY CHANGE: sm:-translate-x-16 */}
          <Link
            ref={herbalBtnRef}
            to="/bulk-herbal"
            className="
              inline-flex items-center justify-center
              w-full max-w-[380px] sm:w-auto sm:max-w-none
              px-6 py-4
              text-sm sm:text-base
              font-black tracking-[0.12em] uppercase
              bg-[#C43A2F] text-white
              hover:brightness-110 hover:scale-[1.02]
              active:scale-[0.98]
              shadow-xl will-change-transform
              order-3
              sm:order-none sm:col-start-2 sm:row-start-1
              sm:-translate-x-16
            "
            style={{
              fontFamily: "Montserrat, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear",
            }}
          >
            SHOP BULK HERBAL RANGE
          </Link>

          <Link
  ref={mushroomBtnRef}
  to="/products"
  className="
    inline-flex items-center justify-center
    w-full max-w-[380px] sm:w-auto sm:max-w-none
    px-6 py-4
    text-sm sm:text-base
    font-black tracking-[0.12em] uppercase
    bg-[#1a3a5c] text-white
    hover:brightness-110 hover:scale-[1.02]
    active:scale-[0.98]
    shadow-xl will-change-transform
    order-4
    sm:order-none sm:col-start-1 sm:row-start-2
    sm:-translate-x-16
  "
            style={{
              fontFamily: "Montserrat, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear",
            }}
          >
            SHOP MUSHROOM RANGE
          </Link>
        </div>
      </div>
    </section>
  );
}