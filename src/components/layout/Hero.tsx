import { Link } from "react-router-dom";
import webBg from "../../assets/web-bg.png";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden min-h-[100svh] flex items-center"
      style={{
        backgroundImage: `url(${webBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* overlay + vignette */}
      <div className="absolute inset-0 bg-white/5" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,rgba(0,0,0,0.8)_55%,rgba(0,0,0,0.95)_100%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
        <div className="max-w-2xl">
          {/* HERO HEADING */}
          <h1
            className="text-6xl font-extrabold leading-[1.02] tracking-tight sm:text-8xl"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            <span className="block text-white">FRESH.</span>

            <span className="block text-[#C43A2F]">
              EXOTIC.
            </span>

            <span className="block text-white whitespace-nowrap">
              LOCALLY GROWN.
            </span>
          </h1>

          {/* SUBTEXT */}
          <p className="mt-6 text-base text-white/75 sm:text-lg">
            Mushrooms are a popular ingredient in many dishes. They come in a variety of shapes and sizes, and each type has its unique flavor and texture.
            While you may be familiar with popular mushrooms like button and portobello, there is a whole world of rare and exotic mushrooms waiting to be discovered.
          </p>

          {/* DOUBLE CTA */}
          <div className="mt-10 flex flex-wrap gap-4">
            
            {/* MUSHROOM BUTTON */}
            <Link
              to="/products"
              className="
                inline-flex items-center justify-center
                rounded-xl
                px-8 py-4
                text-base sm:text-lg
                font-extrabold tracking-wide
                bg-[#C43A2F]
                text-white
                transition
                hover:bg-[#a83228]
                hover:scale-[1.02]
                active:scale-[0.98]
                shadow-[0_0_25px_rgba(196,58,47,0.6)]
              "
            >
              VIEW MUSHROOM PRODUCTS
            </Link>

            {/* HERBAL BUTTON */}
            <Link
              to="/bulk-herbal"
              className="
                inline-flex items-center justify-center
                rounded-xl
                px-8 py-4
                text-base sm:text-lg
                font-extrabold tracking-wide
                bg-white
                text-black
                transition
                hover:bg-gray-200
                hover:scale-[1.02]
                active:scale-[0.98]
                shadow-[0_0_25px_rgba(255,255,255,0.4)]
              "
            >
              VIEW HERBAL PRODUCTS
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
