import { Link } from "react-router-dom";
import featuredBg from "../../assets/featured-bg.png";

type Item = {
  title: string;
  desc: string;
  href: string;
  image: string;
  bullets: string[];
};

const items: Item[] = [
  {
    title: "Mushroom Grow Kits",
    desc: "Beginner-friendly kits for clean home harvests.",
    href: "/mushrooms/grow-kits",
    image: "/images/grow-kits.png",
    bullets: ["Great for beginners", "Step-by-step simple", "Perfect gifts"],
  },
  {
    title: "Grain & Cultures",
    desc: "Reliable genetics and spawn to level up your grows.",
    href: "/mushrooms/grain-and-cultures",
    image: "/images/grain.png",
    bullets: ["Quality cultures", "Clean grain options", "Consistent results"],
  },
  {
    title: "Cultivation Supplies",
    desc: "Bags, tools, substrates, and the stuff that actually matters.",
    href: "/mushrooms/cultivation-supplies",
    image: "/images/supplies.png",
    bullets: ["Grow-ready supplies", "Stock up easily", "Better yields"],
  },
  {
    title: "Medicinal Supplements",
    desc: "Functional mushroom products for daily routines.",
    href: "/mushrooms/medicinal-supplements",
    image: "/images/supplements.png",
    bullets: ["Everyday support", "Easy routines", "Trusted ingredients"],
  },
  {
    title: "Bulk Herbal Products",
    desc: "Bulk herbs & botanicals for serious stock-ups.",
    href: "/bulk-herbal",
    image: "/images/herbal.jpeg",
    bullets: ["Bulk-friendly", "Great value", "Wide selection"],
  },
];

export default function FeaturedCategories() {
  return (
    <section
      className="relative w-full py-20"
      style={{
        backgroundImage: `url(${featuredBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Let the background actually show */}
      <div className="absolute inset-0 bg-white/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.40)_0%,rgba(255,255,255,0.70)_55%,rgba(255,255,255,0.85)_100%)]" />

      {/* Centered container */}
      <div className="relative mx-auto w-full max-w-[1600px] px-6 sm:px-10 xl:px-16">
        {/* Heading */}
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50">
            Featured Categories
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-black">
            Shop by category
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="group w-full max-w-[320px] rounded-3xl bg-black p-6 shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              {/* Image */}
              <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white">{item.title}</h3>

              {/* Description */}
              <p className="mt-2 text-sm text-white/70">{item.desc}</p>

              {/* Bullets */}
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                {item.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-6 text-sm font-semibold text-white/80 transition group-hover:text-white">
                Browse →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
