import { useEffect } from "react";
import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";
import ReviewsSection from "../components/home/ReviewsSection";
import Footer from "../components/layout/Footer";

export default function Home() {
  useEffect(() => {
    // Enable scrolling
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevBodyOverflow = document.body.style.overflowY;

    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";

    // 🔥 Preload background image for near-instant render
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/web-bg.webp";
    document.head.appendChild(link);

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.body.style.overflowY = prevBodyOverflow;
    };
  }, []);

  return (
    <main className="text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/web-bg.webp')`, // ✅ direct load
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            // ❌ REMOVE THIS (kills performance especially on mobile)
            // backgroundAttachment: "fixed",
          }}
        />

        {/* Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.45)" }}
        />
      </div>

      {/* Scroll container */}
      <div
        className="h-[100svh] overflow-y-auto snap-y snap-mandatory"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
          background: "transparent",
        }}
      >
        <section className="snap-start min-h-[100svh] bg-transparent">
          <Hero />
        </section>

        <section className="snap-start min-h-[100svh] bg-transparent flex items-center">
          <div className="w-full bg-transparent">
            <FeaturedCategories />
          </div>
        </section>

        <section className="snap-start min-h-[100svh] bg-transparent flex items-center justify-center">
          <div className="w-full bg-transparent">
            <ReviewsSection sectionVisible={true} />
          </div>
        </section>

        <section className="snap-start min-h-[100svh] bg-transparent flex items-end">
          <div className="w-full bg-transparent">
            <Footer />
          </div>
        </section>
      </div>
    </main>
  );
}