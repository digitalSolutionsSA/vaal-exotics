import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  return (
    <main className="relative min-h-screen text-white">
      {/* ✅ Fixed background so it stays put + shows behind navbar */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url("/images/questions.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ✅ Fixed dark overlay for readability (still behind content) */}
      <div className="fixed inset-0 z-0 bg-black/80 pointer-events-none" />

      {/* ✅ Content above background/overlay */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-32">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-12 text-center">
          FREQUENTLY ASKED QUESTIONS
        </h1>

        {loading ? (
          <p className="text-center text-white/60">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="text-center text-white/60">No FAQs available yet.</p>
        ) : (
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
              >
                <h2 className="text-lg font-bold mb-3 text-white">
                  {faq.question}
                </h2>
                <p className="text-white/70 text-sm sm:text-base whitespace-pre-line">
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
