import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import pageBg from "../assets/new-bg.png";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  published?: boolean;
  updated_at?: string;
};

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaqs = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("faqs")
        .select("id,question,answer,published,updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("FAQ fetch error:", error);
        setFaqs([]);
      } else {
        setFaqs((data ?? []) as FAQItem[]);
      }

      setLoading(false);
    };

    fetchFaqs();
  }, []);

  const headingShadow = "0 6px 24px rgba(0,0,0,0.65)";
  const subShadow = "0 2px 12px rgba(0,0,0,0.55)";

  return (
    <main className="relative min-h-screen text-white">
      {/* ✅ Unified fixed background (same as the rest of the site) */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${pageBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ✅ No massive overlay anymore */}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-20 sm:pt-28 pb-24">
        <p
          className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80 text-center"
          style={{ textShadow: subShadow }}
        >
          Help
        </p>

        <h1
          className="mt-3 text-4xl sm:text-5xl font-extrabold mb-10 text-center text-white"
          style={{ textShadow: headingShadow }}
        >
          FREQUENTLY ASKED QUESTIONS
        </h1>

        {loading ? (
          <p className="text-center text-white/80" style={{ textShadow: subShadow }}>
            Loading FAQs...
          </p>
        ) : faqs.length === 0 ? (
          <p className="text-center text-white/80" style={{ textShadow: subShadow }}>
            No FAQs available yet.
          </p>
        ) : (
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className={[
                  "rounded-2xl",
                  "border border-white/12",
                  "bg-black/35 backdrop-blur-md",
                  "shadow-[0_12px_28px_rgba(0,0,0,0.35)]",
                  "p-6",
                ].join(" ")}
              >
                <h2
                  className="text-lg font-extrabold mb-3 text-white"
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
                >
                  {faq.question}
                </h2>

                <p className="text-white/85 text-sm sm:text-base whitespace-pre-line leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
