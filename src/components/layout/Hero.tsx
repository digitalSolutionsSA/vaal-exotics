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

      // progress: 0 at top, 1 when scrolled past hero
      const progress = Math.min(scrollY / (height * 0.35), 1);


      // VAAL flies out to the LEFT
      if (vaalRef.current) {
        vaalRef.current.style.transform = `translateX(${-progress * 140}px) translateY(${-progress * 30}px)`;
        vaalRef.current.style.opacity = `${1 - progress * 1.4}`;
        vaalRef.current.style.filter = `blur(${progress * 8}px)`;
      }

      // EXOTICS flies out to the RIGHT
      if (exoticsRef.current) {
        exoticsRef.current.style.transform = `translateX(${progress * 140}px) translateY(${progress * 30}px)`;
        exoticsRef.current.style.opacity = `${1 - progress * 1.4}`;
        exoticsRef.current.style.filter = `blur(${progress * 8}px)`;
      }

      // Herbal button dissolves UP and fades
      if (herbalBtnRef.current) {
        herbalBtnRef.current.style.transform = `translateY(${-progress * 60}px) scale(${1 - progress * 0.15})`;
        herbalBtnRef.current.style.opacity = `${1 - progress * 2}`;
      }

      // Mushroom button dissolves DOWN and fades
      if (mushroomBtnRef.current) {
        mushroomBtnRef.current.style.transform = `translateY(${progress * 60}px) scale(${1 - progress * 0.15})`;
        mushroomBtnRef.current.style.opacity = `${1 - progress * 2}`;
      }

      // Background slowly zooms in as you scroll
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
      className="relative overflow-hidden h-[100svh] w-full flex items-center justify-center"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&display=swap"
        rel="stylesheet"
      />

      {/* Background as its own layer so we can zoom it independently */}
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

      {/* Soft overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* CENTERED CONTENT WRAPPER */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">

        {/* ROW 1 */}
        <div className="flex items-center justify-center gap-6 leading-none">
          <h1
            ref={vaalRef}
            className="text-[clamp(6rem,21vw,16rem)] leading-none text-white uppercase m-0 will-change-transform"
            style={{
              fontFamily: "Anton, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear, filter 0.05s linear",
            }}
          >
            VAAL
          </h1>

          <Link
            ref={herbalBtnRef}
            to="/bulk-herbal"
            className="
              inline-flex items-center justify-center
              px-6 py-4
              text-sm sm:text-base
              font-black tracking-[0.12em] uppercase
              bg-[#C43A2F]
              text-white
              hover:brightness-110
              hover:scale-[1.02]
              active:scale-[0.98]
              shadow-xl
              will-change-transform
            "
            style={{
              fontFamily: "Montserrat, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear",
            }}
          >
            SHOP BULK HERBAL RANGE
          </Link>
        </div>

        {/* ROW 2 */}
        <div className="flex items-center justify-center gap-6 leading-none -mt-4 sm:-mt-6">
          <Link
            ref={mushroomBtnRef}
            to="/products"
            className="
              inline-flex items-center justify-center
              px-6 py-4
              text-sm sm:text-base
              font-black tracking-[0.12em] uppercase
              bg-[#1a3a5c]
              text-white
              hover:brightness-110
              hover:scale-[1.02]
              active:scale-[0.98]
              shadow-xl
              will-change-transform
            "
            style={{
              fontFamily: "Montserrat, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear",
            }}
          >
            SHOP MUSHROOM RANGE
          </Link>

          <h1
            ref={exoticsRef}
            className="text-[clamp(6rem,21vw,16rem)] leading-none text-white uppercase m-0 will-change-transform"
            style={{
              fontFamily: "Anton, sans-serif",
              transition: "transform 0.05s linear, opacity 0.05s linear, filter 0.05s linear",
            }}
          >
            EXOTICS
          </h1>
        </div>

      </div>
    </section>
  );
}