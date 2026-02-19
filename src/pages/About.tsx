import pageBg from "../assets/new-bg.png";

export default function About() {
  const headingShadow = "0 6px 24px rgba(0,0,0,0.65)";
  const subShadow = "0 2px 12px rgba(0,0,0,0.55)";

  return (
    <main className="relative min-h-screen text-white">
      {/* ✅ Unified background (same as all other pages) */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${pageBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ✅ No massive black overlay */}

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 sm:pt-28 pb-24">
        <h1
          className="text-4xl sm:text-5xl font-extrabold text-center mb-12 text-white"
          style={{ textShadow: headingShadow }}
        >
          ABOUT VAAL EXOTICS
        </h1>

        <div className="space-y-10 text-white/90 text-base sm:text-lg leading-relaxed">
          <section className="rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-8 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            <h2
              className="text-xl font-bold text-white mb-4"
              style={{ textShadow: subShadow }}
            >
              Fresh. Exotic. Locally Grown.
            </h2>

            <p>
              Cultivated with care on our family farm in Nelsonia, Meyerton.
              <br /><br />
              Nestled in the heart of the Vaal region, we are a family-run farm
              dedicated to the art of mushroom cultivation. Our specialty?
              Premium grow kits that make it easy for anyone to experience the
              joy of growing gourmet mushrooms at home.
              <br /><br />
              Each kit is thoughtfully assembled by hand, using locally sourced
              materials and sustainable methods to ensure quality from farm to
              kitchen. Whether you’re a seasoned chef or a curious beginner,
              our mushrooms bring vibrant flavour, nutrition, and a touch of
              nature’s magic to your meals.
              <br /><br />
              As a small farm rooted in tradition and driven by a love for
              healthy living, we take pride in offering products that are both
              accessible and environmentally friendly. Supporting Vaal Exotics
              means supporting local agriculture, family values, and
              a future where fresh food is grown closer to home.
            </p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-8 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            <h2
              className="text-xl font-bold text-white mb-4"
              style={{ textShadow: subShadow }}
            >
              Our Mission
            </h2>

            <p>
              Our mission is simple: provide fresh, locally grown produce while
              maintaining integrity, transparency, and care in everything we grow.
            </p>

            <p className="mt-4">
              From grow kits and cultivation supplies to medicinal mushrooms
              and bulk herbal products, quality always comes first.
            </p>
          </section>

          <section className="rounded-2xl border border-white/12 bg-black/35 backdrop-blur-md p-8 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
            <h2
              className="text-xl font-bold text-white mb-4"
              style={{ textShadow: subShadow }}
            >
              Why Choose Us
            </h2>

            <ul className="space-y-3 list-disc list-inside">
              <li>Family-operated farm</li>
              <li>Locally cultivated products</li>
              <li>Carefully selected and tested quality</li>
              <li>Reliable customer support</li>
              <li>Passion for what we cultivate</li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
