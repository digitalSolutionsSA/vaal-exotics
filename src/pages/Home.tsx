import { useEffect } from "react";
import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";
import ReviewsSection from "../components/home/ReviewsSection";
import Footer from "../components/layout/Footer";
import webBg from "../assets/web-bg.png";

export default function Home() {
  useEffect(() => {
    // Make sure native scrolling is enabled (in case older code disabled it)
    const prevHtmlOverflow = document.documentElement.style.overflowY;
    const prevBodyOverflow = document.body.style.overflowY;

    document.documentElement.style.overflowY = "auto";
    document.body.style.overflowY = "auto";

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflow;
      document.body.style.overflowY = prevBodyOverflow;
    };
  }, []);

  return (
    <main className="text-white">
      {/* ✅ ONE shared background for the entire Home page */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${webBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            // "fixed" effect (safe because the layer itself is fixed)
            backgroundAttachment: "fixed",
          }}
        />
        {/* Optional overlay so text stays readable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(0,0,0,0.45)" }}
        />
      </div>

      {/* ✅ Scroll container must be TRANSPARENT so it doesn't hide the bg */}
      <div
        className="h-[100svh] overflow-y-auto snap-y snap-mandatory"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
          background: "transparent",
        }}
      >
        {/* Every section also stays transparent */}
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