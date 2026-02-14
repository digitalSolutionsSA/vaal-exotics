import Hero from "../components/layout/Hero";
import FeaturedCategories from "../components/home/FeaturedCategories";


export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Hero />
      <FeaturedCategories />
      
    </main>
  );
}
